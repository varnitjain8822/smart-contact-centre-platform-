import { useTranslation } from 'react-i18next';
import { DatabaseZap } from 'lucide-react';
import { Badge } from '../../ui/Badge';

/** v4: the AI answer used a lookup in the customer's own records. */
export function RecordsChip() {
  const { t } = useTranslation();
  return <Badge tone="ai"><DatabaseZap aria-hidden size={12} /> {t('ai.checkedRecords')}</Badge>;
}
