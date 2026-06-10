interface MentionBodyProps {
  body: string;
  mentions: Array<{ userId: string; name: string | null }>;
  className?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MentionBody({ body, mentions, className }: MentionBodyProps) {
  const mentionNames = mentions
    .map((mention) => mention.name?.trim())
    .filter((name): name is string => Boolean(name));

  if (mentionNames.length === 0) {
    return <span className={className}>{body}</span>;
  }

  const pattern = new RegExp(`(@(?:${mentionNames.map(escapeRegExp).join("|")}))`, "g");
  const parts = body.split(pattern);
  const segments: Array<{ key: string; text: string; isMention: boolean }> = [];
  let offset = 0;

  for (const part of parts) {
    if (!part) {
      continue;
    }

    segments.push({
      key: `${offset}`,
      text: part,
      isMention: part.startsWith("@"),
    });
    offset += part.length;
  }

  return (
    <span className={className}>
      {segments.map((segment) =>
        segment.isMention ? (
          <span key={segment.key} className="font-medium text-primary">
            {segment.text}
          </span>
        ) : (
          segment.text
        ),
      )}
    </span>
  );
}
