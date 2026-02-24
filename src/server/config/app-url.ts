const DEV_DEFAULT_APP_URL = "http://localhost:3000";

function normalizeUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return normalizeUrl(configuredUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_DEFAULT_APP_URL;
  }

  throw new Error("Missing NEXT_PUBLIC_APP_URL in production environment.");
}
