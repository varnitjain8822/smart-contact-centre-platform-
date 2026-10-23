import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import type { TicketSummary } from '../../lib/types';
import { Badge } from '../../ui/Badge';

/** "WhatsApp" label on tickets that came in over WhatsApp; nothing for portal tickets. */
export function ChannelBadge({ channel }: { channel?: TicketSummary['channel'] }) {
  const { t } = useTranslation();
  if (channel !== 'whatsapp') return null;
  return <Badge tone="ok"><MessageCircle aria-hidden size={12} />{t('ticket.whatsapp')}</Badge>;
}
