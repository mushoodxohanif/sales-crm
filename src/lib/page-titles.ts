const STATIC_TITLES: Record<string, { title: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/campaign-types": {
    title: "Campaign types",
  },
  "/campaign-types/new": {
    title: "New campaign type",
  },
  "/campaigns": {
    title: "Campaigns",
  },
  "/campaigns/new": {
    title: "New campaign",
  },
  "/import": {
    title: "Import leads",
  },
  "/notifications": {
    title: "Notifications",
  },
  "/messages": {
    title: "Messages",
  },
  "/team": {
    title: "Team",
  },
  "/targets": {
    title: "Daily targets",
  },
  "/tasks": {
    title: "Tasks",
  },
  "/tools/linkedin-comment": {
    title: "LinkedIn comment",
  },
  "/settings/icp": {
    title: "ICP settings",
  },
};

const DYNAMIC_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
}> = [
  {
    pattern: /^\/campaigns\/[^/]+\/leads\/[^/]+$/,
    title: "Lead",
  },
  {
    pattern: /^\/campaigns\/[^/]+\/leads\/new$/,
    title: "Add lead",
  },
  {
    pattern: /^\/campaigns\/[^/]+$/,
    title: "Campaign",
  },
  {
    pattern: /^\/campaign-types\/[^/]+$/,
    title: "Campaign type",
  },
];

export function getDefaultPageTitle(pathname: string): { title: string } {
  if (STATIC_TITLES[pathname]) {
    return STATIC_TITLES[pathname];
  }

  for (const { pattern, title } of DYNAMIC_PATTERNS) {
    if (pattern.test(pathname)) {
      return { title };
    }
  }

  return { title: "Lead'em" };
}
