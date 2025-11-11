import { env } from "@/config/env";

function stripTrailingSlash(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

type HeaderStore = {
  get(name: string): string | null;
};

export function resolveAppOrigin(headersStore: HeaderStore) {
  if (env.NEXT_PUBLIC_APP_URL) {
    return stripTrailingSlash(env.NEXT_PUBLIC_APP_URL);
  }

  const host = headersStore.get("x-forwarded-host") ?? headersStore.get("host");
  if (!host) {
    return null;
  }

  const protocolHeader = headersStore.get("x-forwarded-proto");
  const protocol = protocolHeader ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
