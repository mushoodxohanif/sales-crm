import Pusher from "pusher";

let pusherInstance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (pusherInstance) {
    return pusherInstance;
  }

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  pusherInstance = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return pusherInstance;
}

export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: unknown,
): Promise<void> {
  const pusher = getPusherServer();

  if (!pusher) {
    console.warn("[pusher] Missing credentials; skipping trigger for", channel, event);
    return;
  }

  try {
    await pusher.trigger(channel, event, data);
  } catch (error) {
    console.error("[pusher] Failed to trigger event:", channel, event, error);
  }
}
