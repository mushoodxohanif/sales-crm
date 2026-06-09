export function getAllowedWorkspaceDomains(): string[] {
  const raw = process.env.ALLOWED_GOOGLE_WORKSPACE_DOMAIN;

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

export function getPrimaryWorkspaceDomain(): string | undefined {
  return getAllowedWorkspaceDomains()[0];
}

interface WorkspaceProfile {
  email?: string | null;
  email_verified?: boolean | null;
  hd?: string | null;
}

export function isAllowedWorkspaceUser(profile: WorkspaceProfile | undefined): boolean {
  if (!profile?.email || profile.email_verified !== true) {
    return false;
  }

  const allowedDomains = getAllowedWorkspaceDomains();

  if (allowedDomains.length === 0) {
    return false;
  }

  const emailDomain = profile.email.split("@")[1]?.toLowerCase();

  if (!emailDomain || !allowedDomains.includes(emailDomain)) {
    return false;
  }

  if (profile.hd) {
    const hostedDomain = profile.hd.toLowerCase();

    if (!allowedDomains.includes(hostedDomain)) {
      return false;
    }
  }

  return true;
}
