import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, FileCheck2, LifeBuoy, Store, Truck, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import type { Category, KbArticleSummary } from '../../lib/types';
import { CATEGORIES } from '../../lib/types';
import { categoryLabel } from '../../lib/format';

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Account: UserRound, Billing: CreditCard, Technical: Wrench, 'Commerce & Trade': Store,
  'Compliance & GST': FileCheck2, 'Logistics & Orders': Truck, General: LifeBuoy,
};

export function CategoryGrid({ articles }: { articles: KbArticleSummary[] }) {
  const { t } = useTranslation();
  const counts = new Map<Category, number>();
  for (const a of articles) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  const cats = CATEGORIES.filter((c) => counts.get(c));
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cats.map((c) => {
        const Icon = CATEGORY_ICON[c];
        const n = counts.get(c) ?? 0;
        return (
          <li key={c}>
            <Link to={`/help?category=${encodeURIComponent(c)}`}
              className="group flex min-h-11 items-center gap-4 rounded-md border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
              <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-accent-soft text-accent"><Icon aria-hidden size={21} strokeWidth={1.75} /></span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{categoryLabel(c)}</span>
                <span className="text-sm text-muted">{t('help.count', { count: n })}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
