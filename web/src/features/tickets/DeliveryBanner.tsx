import { CloudOff, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DeliveryBanner({ delivery }: { delivery: 'synced' | 'queued' | 'delayed' }) {
  const { t } = useTranslation();
  if (delivery === 'synced') return null;
  const queued = delivery === 'queued';
  const Icon = queued ? Clock : CloudOff;
  return (
    <div role="status" className={`flex items-start gap-3 rounded-md border px-4 py-3 ${queued ? 'border-info/30 bg-info/10' : 'border-warn/30 bg-warn/10'}`}>
      <Icon aria-hidden size={19} className={`mt-0.5 shrink-0 ${queued ? 'text-info' : 'text-warn'}`} />
      <p className="text-[15px] text-ink">
        <strong className="font-semibold">{t(queued ? 'delivery.queued' : 'delivery.delayed')}</strong>
        {' — '}{t(queued ? 'delivery.queuedBody' : 'delivery.delayedBody')}
      </p>
    </div>
  );
}
