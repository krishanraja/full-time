import { createHash, createSign } from 'node:crypto';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const base64url = (data) => Buffer.from(data).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest('hex');

/** Accept either an OAuth user refresh token (preferred for My Drive) or a
 * service account key (appropriate for Shared Drives with folder access).
 * Credentials come exclusively from GitHub Actions secrets, never the repo. */
export async function driveToken(credentials, request = fetch) {
  if (credentials?.refresh_token && credentials?.client_id && credentials?.client_secret) {
    const response = await request('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    if (!response.ok) throw Error(`Google OAuth refresh failed HTTP ${response.status}`);
    const token = await response.json();
    if (!token.access_token) throw Error('Google OAuth refresh returned no access token');
    return token.access_token;
  }
  if (!credentials?.client_email || !credentials?.private_key) {
    throw Error('Drive credentials require OAuth refresh token or service account fields');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({
    iss: credentials.client_email, scope: DRIVE_SCOPE,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const jwt = `${unsigned}.${signer.sign(credentials.private_key, 'base64url')}`;
  const response = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!response.ok) throw Error(`Google service-account OAuth failed HTTP ${response.status}`);
  const token = await response.json();
  if (!token.access_token) throw Error('Google OAuth token missing');
  return token.access_token;
}

/** Create a non-destructive immutable archive file, or verify an exact retry.
 * Hash-based readback guards against silent mismatches and partial deliveries. */
export async function uploadJson(name, value, { credentials, folderId, request = fetch } = {}) {
  if (!/^[-a-z0-9]+\.json$/i.test(name)) throw Error('Unsafe JSON filename');
  if (!folderId) throw Error('Drive destination folder must be configured');
  const json = `${JSON.stringify(value, null, 2)}\n`;
  JSON.parse(json);
  const token = await driveToken(credentials, request);
  const auth = { Authorization: `Bearer ${token}` };
  const fields = 'id,name,mimeType,parents,size,webViewLink';
  const searchQuery = `name = '${name.replaceAll("'", "\\'")}' and '${folderId}' in parents and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=nextPageToken,files(${fields})&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const listing = await request(listUrl, { headers: auth });
  if (!listing.ok) throw Error(`Drive destination inspection HTTP ${listing.status}`);
  const found = await listing.json();
  if (found.nextPageToken) throw Error('Drive destination listing paginated; refusing uncertain duplicate state');
  if ((found.files ?? []).length > 1) throw Error(`Multiple existing Drive files named ${name}; refusing overwrite`);
  let file = found.files?.[0] ?? null;
  if (!file) {
    const boundary = `ft_evidence_${Date.now()}`;
    const metadata = JSON.stringify({ name, mimeType: 'application/json', parents: [folderId] });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`;
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent(fields)}&supportsAllDrives=true`;
    const uploaded = await request(uploadUrl, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!uploaded.ok) throw Error(`Drive file creation failed HTTP ${uploaded.status}`);
    file = await uploaded.json();
  }
  if (file.mimeType !== 'application/json' || !file.parents?.includes(folderId)) {
    throw Error('Drive file metadata mismatch');
  }
  const get = await request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, { headers: auth });
  if (!get.ok) throw Error(`Drive readback HTTP ${get.status}`);
  const content = await get.text();
  if (digest(content) !== digest(json)) throw Error('Drive readback content/hash mismatch (existing filename conflict or upload damage)');
  return { id: file.id, name: file.name, url: file.webViewLink || null, bytes: Buffer.byteLength(content), sha256: digest(content) };
}