import type { Priority } from '../../lib/types';
import { useTranslation } from 'react-i18next';
import { priorityLabel } from '../../lib/format';

const LEVEL: Record<Priority, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/** Signal bars + word; colour only adds emphasis for Critical. */
export function PriorityTag({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  const n = LEVEL[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${priority === 'critical' ? 'text-bad' : 'text-ink-2'}`}>
      <svg aria-hidden width="14" height="12" viewBox="0 0 14 12">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 3.6} y={9 - i * 3} width="2.4" height={3 + i * 3} rx="1" fill="currentColor" opacity={i < n ? 1 : 0.22} />
        ))}
      </svg>
      {priorityLabel(priority)}<span className="sr-only"> {t('priority.suffix')}</span>
    </span>
  );
}
