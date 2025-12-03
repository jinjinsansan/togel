export const normalizeBaseUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/$/, "");
  }
  return `https://${trimmed.replace(/\/$/, "")}`;
};

export const getAppBaseUrl = (request?: Request) => {
  const envUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeBaseUrl(process.env.APP_BASE_URL) ||
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (envUrl) return envUrl;

  if (request) {
    const headerOrigin = normalizeBaseUrl(request.headers.get("origin"));
    if (headerOrigin) return headerOrigin;

    try {
      const { protocol, host } = new URL(request.url);
      return `${protocol}//${host}`;
    } catch {
      // noop
    }
  }

  const vercelUrl = normalizeBaseUrl(process.env.VERCEL_URL);
  if (vercelUrl) return vercelUrl;

  return "http://localhost:3000";
};
