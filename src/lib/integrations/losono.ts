export const LOSONO_OAUTH_CLIENT_ID = "losono";

export const LOSONO_CALLBACK_PATH = "/api/integrations/sales-crm/callback";

export function isLosonoRedirectUri(redirectUri: string): boolean {
  try {
    const url = new URL(redirectUri);

    if (url.pathname !== LOSONO_CALLBACK_PATH) {
      return false;
    }

    if (url.search || url.hash) {
      return false;
    }

    if (url.protocol === "https:") {
      return true;
    }

    return (
      url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}
