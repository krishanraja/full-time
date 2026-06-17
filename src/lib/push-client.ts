// Web Push client helpers. VAPID public key is fetched from the server.
import { supabase } from "@/integrations/supabase/client";
import { savePushSubscription, deletePushSubscription, getVapidPublicKey } from "./api/push.functions";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Std = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Std);
  const buf = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.warn("[push] SW registration failed", err);
    return null;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

export async function subscribeToPush(): Promise<boolean> {
  if (typeof window === "undefined" || !("PushManager" in window)) {
    console.warn("[push] not supported");
    return false;
  }
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return false;

  const { key } = await getVapidPublicKey();
  if (!key) {
    alert("Push notifications are not configured yet. Ask the admin to add VAPID keys.");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await getRegistration();
  if (!reg) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  });
  type Plausible = (e: string) => void;
  const plausible = (window as unknown as { plausible?: Plausible }).plausible;
  if (typeof plausible === "function") plausible("push_opt_in");
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await deletePushSubscription({ data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
