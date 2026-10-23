import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, UserRound } from 'lucide-react';
import type { TicketActions as Flags } from '../../lib/types';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';

type A = 'accept' | 'handoff' | 'resolve';

/** Buttons shown strictly per server flags; Close sits behind a confirmation. */
export function TicketActions({ actions, onAction, pending }: { actions: Flags; onAction(a: A): void; pending?: A | null }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  if (!actions.canAccept && !actions.canRequestHuman && !actions.canResolve) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.canAccept && (
        <Button pending={pending === 'accept'} disabled={!!pending} onClick={() => onAction('accept')}>
          <CircleCheck aria-hidden size={18} /> {t('actions.accept')}
        </Button>
      )}
      {actions.canRequestHuman && (
        <Button variant="secondary" pending={pending === 'handoff'} disabled={!!pending} onClick={() => onAction('handoff')}>
          <UserRound aria-hidden size={18} /> {t('actions.handoff')}
        </Button>
      )}
      {actions.canResolve && (
        <Button variant="ghost" disabled={!!pending} onClick={() => setConfirming(true)}>{t('actions.close')}</Button>
      )}
      <Dialog open={confirming} title={t('actions.confirmTitle')} onClose={() => setConfirming(false)}>
        <p className="text-ink-2">{t('actions.confirmBody')}</p>
        <form method="dialog" className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirming(false)}>{t('actions.keepOpen')}</Button>
          <Button pending={pending === 'resolve'} onClick={() => { setConfirming(false); onAction('resolve'); }}>{t('actions.close')}</Button>
        </form>
      </Dialog>
    </div>
  );
}
