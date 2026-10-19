import { createHash, createSign } from 'node:crypto';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const base64url = (data) => Buffer.from(data).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest('hex');

/** Google emits a machine-readable reason inside most 403 responses.
 * Never log the full body: it can contain user identifiers or resource IDs. */
async function driveFailure(operation,response,oauthClientId){
  let reason='unspecified';
  let oauthProjectMatch='unknown';
  try{
    const data=await response.json();
    reason=String(data?.error?.errors?.[0]?.reason || data?.error?.status || 'unspecified')
      .replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,80);
    if(reason==='accessNotConfigured' && oauthClientId){
      const oauthProject=String(oauthClientId).match(/^(\d+)-[^.]+\.apps\.googleusercontent\.com$/)?.[1];
      const details=data?.error?.details;
      const consumer=Array.isArray(details)?details.find(x=>x?.metadata?.consumer)?.metadata?.consumer:null;
      const blockedProject=String(consumer??'').match(/projects\/(\d+)/)?.[1] ||
        String(data?.error?.message??'').match(/project\s+(\d+)/i)?.[1];
      if(oauthProject && blockedProject)oauthProjectMatch=oauthProject===blockedProject?'yes':'no';
    }
  }catch{/* no parseable error body */}
  return new Error(`${operation} HTTP ${response.status} reason=${reason}`+
    (reason==='accessNotConfigured'?` oauth_project_match=${oauthProjectMatch}`:''));
}


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

/** Read-only access check, safe to run even when collection is incomplete. */
export async function checkDriveFolder(credentials, folderId, request = fetch) {
  if (!folderId) throw Error('Drive destination folder must be configured');
  const token = await driveToken(credentials, request);
  const response = await request(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw await driveFailure('Drive folder preflight', response, credentials?.client_id);
  const folder = await response.json();
  if (folder.mimeType !== 'application/vnd.google-apps.folder') throw Error('Drive destination is not a folder');
  if (folder.capabilities?.canAddChildren === false) throw Error('Drive destination has no file-creation permission');
  return {status:'accessible',folder_id:folderId};
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
  // Fail early on missing folder access; otherwise a scope or ACL problem
  // looks identical to a transient upload failure.
  await checkDriveFolder(credentials,folderId,request);
  const searchQuery = `name = '${name.replaceAll("'", "\\'")}' and '${folderId}' in parents and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=nextPageToken,files(${fields})&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const listing = await request(listUrl, { headers: auth });
  if (!listing.ok) throw await driveFailure('Drive destination inspection',listing);
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
    if (!uploaded.ok) throw await driveFailure('Drive file creation',uploaded);
    file = await uploaded.json();
  }
  if (file.mimeType !== 'application/json' || !file.parents?.includes(folderId)) {
    throw Error('Drive file metadata mismatch');
  }
  const get = await request(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, { headers: auth });
  if (!get.ok) throw await driveFailure('Drive readback',get);
  const content = await get.text();
  if (digest(content) !== digest(json)) throw Error('Drive readback content/hash mismatch (existing filename conflict or upload damage)');
  return { id: file.id, name: file.name, url: file.webViewLink || null, bytes: Buffer.byteLength(content), sha256: digest(content) };
}
