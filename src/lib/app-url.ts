export function appUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function onboardUrl(token: string) {
  return `${appUrl()}/onboard?token=${encodeURIComponent(token)}`;
}

export function onboardTokenFromPath(path: string | null | undefined) {
  if (!path) return null;
  try {
    return new URL(path, "http://local.invalid").searchParams.get("token");
  } catch {
    return null;
  }
}
