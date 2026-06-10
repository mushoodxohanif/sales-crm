import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parsePusherChannel } from "@/lib/realtime/channels";
import { getPusherServer } from "@/lib/realtime/pusher-server";

async function canSubscribeToChannel(userId: string, channelName: string): Promise<boolean> {
  const parsed = parsePusherChannel(channelName);

  if (!parsed) {
    return false;
  }

  switch (parsed.type) {
    case "user":
      return parsed.id === userId;
    case "lead":
      return true;
    case "conversation": {
      const conversation = await db.conversation.findUnique({
        where: { id: parsed.id },
        select: { participant1Id: true, participant2Id: true },
      });

      if (!conversation) {
        return false;
      }

      return conversation.participant1Id === userId || conversation.participant2Id === userId;
    }
    default:
      return false;
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const pusher = getPusherServer();

  if (!pusher) {
    return new Response("Pusher not configured", { status: 503 });
  }

  const body = await request.formData();
  const socketId = body.get("socket_id");
  const channelName = body.get("channel_name");

  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return new Response("Bad request", { status: 400 });
  }

  const allowed = await canSubscribeToChannel(session.user.id, channelName);

  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);

  return Response.json(authResponse);
}
