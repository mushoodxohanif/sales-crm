export const INTEGRATION_SCOPES = {
  "campaigns:read": "View campaign names and field definitions",
  "leads:write": "Create leads in your campaigns",
} as const;

export type IntegrationScope = keyof typeof INTEGRATION_SCOPES;

export const ALL_INTEGRATION_SCOPES = Object.keys(INTEGRATION_SCOPES) as IntegrationScope[];

export function parseScopeString(scope: string | null | undefined): IntegrationScope[] {
  if (!scope?.trim()) {
    return [];
  }

  return scope
    .split(/\s+/)
    .filter((value): value is IntegrationScope =>
      ALL_INTEGRATION_SCOPES.includes(value as IntegrationScope),
    );
}

export function validateRequestedScopes(scopes: IntegrationScope[]): IntegrationScope[] | null {
  if (scopes.length === 0) {
    return null;
  }

  const unique = [...new Set(scopes)];

  if (unique.some((scope) => !ALL_INTEGRATION_SCOPES.includes(scope))) {
    return null;
  }

  return unique;
}

export function formatScopeString(scopes: IntegrationScope[]): string {
  return scopes.join(" ");
}
