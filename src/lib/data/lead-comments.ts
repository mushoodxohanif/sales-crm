import { db } from "@/lib/db";

export async function getLeadComments(leadId: string) {
  return db.leadComment.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      mentions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
