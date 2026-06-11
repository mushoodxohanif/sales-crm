import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

type TransactionClient = Prisma.TransactionClient;

export async function recordStageTransition(
  input: {
    leadId: string;
    fromStageId: string | null;
    toStageId: string;
    userId: string;
  },
  client: TransactionClient | typeof db = db,
) {
  if (input.fromStageId === input.toStageId) {
    return;
  }

  await client.leadStageTransition.create({
    data: {
      leadId: input.leadId,
      fromStageId: input.fromStageId,
      toStageId: input.toStageId,
      userId: input.userId,
    },
  });
}

export function getUtcDayBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}
