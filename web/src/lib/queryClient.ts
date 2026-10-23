import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

// Global 401 (lld-frontend §15): session gone → clear cache and go to login. The ['me'] query is skipped so public
// Help pages work signed-out; only code UNAUTHENTICATED counts (login's INVALID_CREDENTIALS is also a 401).
export function onUnauthenticated(qc: QueryClient, e: unknown, key?: readonly unknown[]) {
  if (!(e instanceof ApiError) || e.code !== 'UNAUTHENTICATED' || key?.[0] === 'me') return;
  qc.clear();
  const here = location.pathname + location.search;
  if (!location.pathname.startsWith('/login')) location.assign(`/login?next=${encodeURIComponent(here)}`);
}

export function makeQueryClient() {
  const qc: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (e, q) => onUnauthenticated(qc, e, q.queryKey) }),
    mutationCache: new MutationCache({ onError: (e) => onUnauthenticated(qc, e) }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
        refetchOnWindowFocus: true,
      },
    },
  });
  return qc;
}
