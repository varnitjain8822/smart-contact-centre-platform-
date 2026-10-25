import { useEffect, useState } from 'react';

const LOCAL_ADMIN = 'http://localhost:3310/app/login';
let cachedAdminUrl: string | null = null;

export async function fetchAdminUrl(): Promise<string> {
  if (cachedAdminUrl) return cachedAdminUrl;

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '');

  // Locally or in jsdom unit tests, return default immediately without consuming fetch
  if (isLocal) {
    cachedAdminUrl = LOCAL_ADMIN;
    return LOCAL_ADMIN;
  }

  try {
    const res = await fetch('/live-endpoints.json');
    if (res.ok) {
      const data = await res.json();
      if (data.adminPortalUrl) {
        const clean = data.adminPortalUrl.replace(/\/app.*$/, '').replace(/\/$/, '');
        const fullUrl = `${clean}/app/login`;
        cachedAdminUrl = fullUrl;
        return fullUrl;
      }
    }
  } catch {
    // ignore network errors
  }

  return LOCAL_ADMIN;
}

export function useAdminUrl(): string {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  const [url, setUrl] = useState<string>(
    cachedAdminUrl || (isLocal ? LOCAL_ADMIN : LOCAL_ADMIN)
  );

  useEffect(() => {
    fetchAdminUrl().then((u) => setUrl(u));
  }, []);

  return url;
}
