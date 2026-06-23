export const campaignTypeFieldsQuery = {
  orderBy: { sortOrder: "asc" as const },
  include: {
    group: {
      select: {
        id: true,
        label: true,
      },
    },
  },
} as const;
