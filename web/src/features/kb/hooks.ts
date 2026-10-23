import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { Category } from '../../lib/types';

const KB_STALE = 10 * 60_000;

/** Keys carry the UI language: the API serves Hindi titles/bodies for `locale=hi`. */
export function useKbArticles({ q = '', category = null, enabled = true }: { q?: string; category?: Category | null; enabled?: boolean }) {
  const lng = useTranslation().i18n.language;
  return useQuery({ queryKey: ['kb', lng, { q, category }], queryFn: () => api.kbList(q, category).then((r) => r.items), staleTime: KB_STALE, enabled });
}

export function useKbArticle(slug: string) {
  const lng = useTranslation().i18n.language;
  return useQuery({ queryKey: ['kb', lng, 'article', slug], queryFn: () => api.kbArticle(slug).then((r) => r.article), staleTime: KB_STALE });
}
