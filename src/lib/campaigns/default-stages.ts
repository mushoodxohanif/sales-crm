export const DEFAULT_STAGES = [
  { name: "New", slug: "new", sortOrder: 0, color: "#6366f1", isDefault: true },
  { name: "Contacted", slug: "contacted", sortOrder: 1, color: "#8b5cf6", isDefault: false },
  { name: "Qualified", slug: "qualified", sortOrder: 2, color: "#0ea5e9", isDefault: false },
  { name: "Won", slug: "won", sortOrder: 3, color: "#22c55e", isDefault: false },
  { name: "Lost", slug: "lost", sortOrder: 4, color: "#ef4444", isDefault: false },
] as const;

export type DefaultStage = (typeof DEFAULT_STAGES)[number];
