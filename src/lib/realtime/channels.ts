export const pusherChannels = {
  user: (userId: string) => `private-user-${userId}`,
  lead: (leadId: string) => `private-lead-${leadId}`,
  conversation: (conversationId: string) => `private-conversation-${conversationId}`,
} as const;

const CHANNEL_PATTERNS = {
  user: /^private-user-(.+)$/,
  lead: /^private-lead-(.+)$/,
  conversation: /^private-conversation-(.+)$/,
} as const;

export function parsePusherChannel(channelName: string) {
  const userMatch = CHANNEL_PATTERNS.user.exec(channelName);
  if (userMatch) {
    return { type: "user" as const, id: userMatch[1] };
  }

  const leadMatch = CHANNEL_PATTERNS.lead.exec(channelName);
  if (leadMatch) {
    return { type: "lead" as const, id: leadMatch[1] };
  }

  const conversationMatch = CHANNEL_PATTERNS.conversation.exec(channelName);
  if (conversationMatch) {
    return { type: "conversation" as const, id: conversationMatch[1] };
  }

  return null;
}
