import { CircleCheck, Hourglass, Sparkles, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Status } from '../../lib/types';
import { statusLabel } from '../../lib/format';
import { Pill, type Tone } from '../../ui/Pill';

const MAP: Record<Status, { icon: typeof Sparkles; tone: Tone }> = {
  ai_handling: { icon: Sparkles, tone: 'ai' },
  in_progress: { icon: UserRound, tone: 'accent' },
  waiting_on_customer: { icon: Hourglass, tone: 'warn' },
  resolved: { icon: CircleCheck, tone: 'ok' },
};

export function StatusPill({ status }: { status: Status }) {
  useTranslation(); // re-render on language change
  const { icon: Icon, tone } = MAP[status];
  return <Pill tone={tone} icon={<Icon aria-hidden size={15} strokeWidth={2} />}>{statusLabel(status)}</Pill>;
}
