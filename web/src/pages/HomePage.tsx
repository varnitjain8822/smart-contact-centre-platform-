import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, CircleCheck, Hourglass, Inbox, LifeBuoy, MessageSquareReply, Plus, Sparkles, Star, TicketCheck, type LucideIcon } from 'lucide-react';
import { useMe } from '../features/auth/hooks';
import { useOverview, useTickets } from '../features/tickets/hooks';
import { StatusPill } from '../features/tickets/StatusPill';
import { KbSearchBox } from '../features/kb/KbSearchBox';
import { ago, statusLabel } from '../lib/format';
import { intlLocale } from '../i18n';
import { useNow } from '../lib/useNow';
import type { Overview, Status, TicketSummary } from '../lib/types';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState, RetryBlock } from '../ui/EmptyState';
import { PageTitle } from '../ui/PageTitle';
import { Skeleton } from '../ui/Skeleton';
import { SlaRing } from '../ui/SlaRing';
import { StatCard } from '../ui/StatCard';
import { buttonClass } from '../ui/Button';
import { FeatureShowcase } from '../features/home/FeatureShowcase';

const OPEN: Status[] = ['ai_handling', 'in_progress', 'waiting_on_customer'];
const href = (s: Status[]) => `/tickets?status=${s.join(',')}`;
const daypart = (h: number) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening');

export default function HomePage() {
  const { t } = useTranslation();
  const user = useMe().data;
  const ov = useOverview();
  const recent = useTickets({}, 6);
  const waiting = useTickets({ status: ['waiting_on_customer'] }, 5);
  const now = useNow(30_000);
  const first = user?.name.split(' ')[0] ?? '';
  const o = ov.data;
  const tickets = recent.data?.pages[0]?.items ?? [];
  const fresh = !!o && !recent.isPending && !tickets.length && !o.activity.length;

  return (
    <div className="mx-auto max-w-3xl xl:max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">{new Intl.DateTimeFormat(intlLocale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(now)}</p>
          <PageTitle title={t('nav.home')} className="mt-1 text-3xl md:text-[40px]">{t(`home.hello.${daypart(new Date(now).getHours())}`, { name: first })}</PageTitle>
          {o && !fresh && <p className="mt-2 text-ink-2">{summary(t, o)}</p>}
        </div>
        <QuickActions />
      </div>

      {fresh ? <FirstRun popular={o.popularArticles} name={first} /> : (
        <>
          <section aria-label={t('home.statsLabel')} className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
            {ov.isError ? <div className="col-span-full"><RetryBlock onRetry={() => ov.refetch()} /></div> : <>
              <StatCard label={t('home.stat.open')} value={o?.counts.open} loading={!o} icon={Inbox} tone="accent" to={href(OPEN)}
                hint={o?.avgFirstResponseMin != null ? t('home.stat.firstReply', { d: mins(t, o.avgFirstResponseMin) }) : undefined} />
              <StatCard label={t('home.stat.ai')} value={o?.counts.aiHandling} loading={!o} icon={Sparkles} tone="ai" to={href(['ai_handling'])}
                hint={t('home.stat.aiHint')} />
              <StatCard label={t('home.stat.waiting')} value={o?.counts.waitingOnYou} loading={!o} icon={Hourglass} tone={o?.counts.waitingOnYou ? 'warn' : 'neutral'}
                to={href(['waiting_on_customer'])} hint={t(o?.counts.waitingOnYou ? 'home.stat.waitingHint' : 'home.stat.waitingNone')} />
              <StatCard label={t('home.stat.resolved')} value={o?.counts.resolved30d} loading={!o} icon={CircleCheck} tone="ok" to={href(['resolved'])}
                hint={o?.csatAvg != null ? t('home.stat.csat', { n: o.csatAvg.toLocaleString(intlLocale()) }) : o?.avgResolutionHrs != null ? t('home.stat.resolution', { n: o.avgResolutionHrs.toLocaleString(intlLocale()) }) : undefined} />
            </>}
          </section>

          {o && <Attention o={o} waiting={waiting.data?.pages[0]?.items ?? []} known={[...tickets, ...(waiting.data?.pages[0]?.items ?? [])]} now={now} />}

          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card className="p-5 sm:p-6">
                <CardHeader title={t('home.recent')} action={<Link to="/tickets" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline">{t('home.allTickets')} <ArrowRight aria-hidden size={15} /></Link>} />
                {recent.isPending ? <div className="mt-4 flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
                  : recent.isError ? <div className="mt-4"><RetryBlock onRetry={() => recent.refetch()} /></div>
                  : <RecentList tickets={tickets} now={now} />}
              </Card>
              <Card className="p-5 sm:p-6">
                <CardHeader title={t('home.activity')} desc={t('home.activityDesc')} />
                {!o ? <div className="mt-4 flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : o.activity.length ? <Activity items={o.activity} now={now} />
                  : <p className="mt-4 text-ink-2">{t('home.noActivity')}</p>}
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <Popular items={o?.popularArticles} />
              <Card className="bg-surface-2/50 p-5 shadow-none">
                <h2 className="text-lg font-semibold">{t('home.quickTitle')}</h2>
                <p className="mb-4 mt-1 text-sm text-ink-2">{t('home.quickBody')}</p>
                <KbSearchBox />
              </Card>
            </div>
          </div>
        </>
      )}
      <FeatureShowcase />
    </div>
  );
}

type TF = ReturnType<typeof useTranslation>['t'];
const mins = (t: TF, m: number) => (m >= 60 ? t('time.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('time.m', { m }));
function summary(t: TF, o: Overview) {
  const parts = [t('home.sum.open', { count: o.counts.open })];
  if (o.counts.waitingOnYou) parts.push(t('home.sum.waiting', { count: o.counts.waitingOnYou }));
  if (o.slaWatch.length) parts.push(t('home.sum.risk', { count: o.slaWatch.length }));
  return parts.join(' · ');
}

function QuickActions() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('home.quick')} className="flex flex-wrap gap-2">
      <Link to="/tickets/new" className={buttonClass('primary')}><Plus aria-hidden size={18} /> {t('nav.newTicket')}</Link>
      <Link to="/assistant" className={buttonClass('ai')}><Sparkles aria-hidden size={17} /> {t('home.askAi')}</Link>
      <Link to="/help" className={buttonClass('secondary', 'max-md:hidden')}><LifeBuoy aria-hidden size={17} /> {t('nav.helpShort')}</Link>
    </nav>
  );
}

/** Tickets that need the customer: waiting on them, or SLA at risk/breached. Ticket stubs with the signal ring. */
function Attention({ o, waiting, known, now }: { o: Overview; waiting: TicketSummary[]; known: TicketSummary[]; now: number }) {
  const { t } = useTranslation();
  const subject = (n: string) => known.find((k) => k.number === n)?.subject;
  const items = [
    ...waiting.map((w) => ({ n: w.number, subject: w.subject, kind: 'waiting' as const, due: null as string | null })),
    ...o.slaWatch.filter((s) => !waiting.some((w) => w.number === s.number)).map((s) => ({ n: s.number, subject: subject(s.number), kind: s.state, due: s.dueAt })),
  ];
  if (!items.length) return null;
  return (
    <section aria-labelledby="attn-h" className="mt-8">
      <h2 id="attn-h" className="flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden className="size-2 rounded-full bg-warn" />{t('home.attention')}
        <span className="text-sm font-medium text-muted tnum">{items.length}</span>
      </h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:grid xl:grid-cols-3 xl:overflow-visible xl:px-0">
        {items.map((it) => {
          const left = it.due ? Date.parse(it.due) - now : 0;
          const tone = it.kind === 'waiting' ? 'warn' : it.kind === 'breached' || left < 0 ? 'bad' : 'warn';
          return (
            <li key={it.n} className="w-[78%] shrink-0 snap-start sm:w-72 xl:w-auto">
              <Link to={`/tickets/${it.n}`} className="group flex h-full flex-col rounded-md border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-[15px] font-semibold tracking-tight text-muted tnum">{it.n}</span>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${tone === 'bad' ? 'text-bad' : 'text-warn'}`}>
                    {it.kind === 'waiting' ? <MessageSquareReply aria-hidden size={16} /> : <SlaRing fraction={0.15} tone={tone} />}
                    {it.kind === 'waiting' ? t('home.replyNeeded') : it.kind === 'breached' || left < 0 ? t('home.slaBreached') : t('home.slaRisk', { d: ago(it.due!, now) })}
                  </span>
                </span>
                <span className="mt-2 line-clamp-2 font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{it.subject ?? t('home.openTicket', { n: it.n })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentList({ tickets, now }: { tickets: TicketSummary[]; now: number }) {
  const { t } = useTranslation();
  if (!tickets.length) return <p className="mt-4 text-ink-2">{t('home.noTickets')}</p>;
  return (
    <ul className="-mx-2 mt-3 divide-y divide-line">
      {tickets.map((x) => (
        <li key={x.number}>
          <Link to={`/tickets/${x.number}`} className="group flex items-center gap-3 rounded-sm px-2 py-3 hover:bg-surface-2/50">
            <span className="w-[4.5rem] shrink-0 font-display text-sm font-semibold tracking-tight text-muted tnum">{x.number}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{x.subject}</span>
              <span className="text-sm text-muted">{t('ticket.updated', { ago: ago(x.lastMessageAt, now) })}</span>
            </span>
            <span className="hidden sm:block"><StatusPill status={x.status} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ACT: Record<Overview['activity'][number]['type'], { icon: LucideIcon; cls: string }> = {
  agent_reply: { icon: MessageSquareReply, cls: 'bg-accent-soft text-accent' },
  ai_answer: { icon: Sparkles, cls: 'bg-ai-soft text-ai' },
  status: { icon: TicketCheck, cls: 'bg-surface-2 text-ink-2' },
  csat: { icon: Star, cls: 'bg-warn/10 text-warn' },
};

function Activity({ items, now }: { items: Overview['activity']; now: number }) {
  const { t } = useTranslation();
  return (
    <ol className="mt-4 flex flex-col">
      {items.map((a, i) => {
        const { icon: Icon, cls } = ACT[a.type];
        const quote = a.type === 'agent_reply' || a.type === 'ai_answer';
        return (
          <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute bottom-0 left-[17px] top-9 w-px bg-line" />}
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${cls}`}><Icon aria-hidden size={16} /></span>
            <div className="min-w-0 flex-1 pt-1.5">
              <p className="text-[15px] text-ink">
                {t(`home.act.${a.type}`, { n: a.ticket, status: a.type === 'status' ? statusLabel(a.text as Status) : '', rating: a.text })}{' '}
                <Link to={`/tickets/${a.ticket}`} className="font-semibold text-accent hover:underline">{a.ticket}</Link>
              </p>
              {quote && a.text && <p className="mt-1 line-clamp-2 border-l-2 border-line pl-3 text-sm text-ink-2">{a.text}</p>}
              <p className="mt-0.5 text-xs text-muted"><time dateTime={a.at}>{ago(a.at, now)}</time></p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Popular({ items }: { items?: Overview['popularArticles'] }) {
  const { t } = useTranslation();
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader title={t('home.popular')} action={<Link to="/help" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline">{t('home.allArticles')}</Link>} />
      {!items ? <div className="mt-4 flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-8" />)}</div> : (
        <ol className="mt-2 flex flex-col">
          {items.map((a) => (
            <li key={a.slug}>
              <Link to={`/help/${a.slug}`} className="group flex min-h-11 items-start gap-3 rounded-sm py-2">
                <BookOpen aria-hidden size={17} className="mt-0.5 shrink-0 text-muted group-hover:text-accent" />
                <span className="min-w-0 flex-1 font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-4">{a.title}</span>
                {a.views > 0 && <span className="shrink-0 text-xs text-muted tnum">{t('home.views', { count: a.views })}</span>}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function FirstRun({ popular, name }: { popular: Overview['popularArticles']; name: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <EmptyState icon={<Inbox aria-hidden size={26} />} title={t('home.firstTitle', { name })}
        actions={<div className="flex flex-wrap justify-center gap-2">
          <Link to="/assistant" className={buttonClass('ai')}><Sparkles aria-hidden size={17} /> {t('home.askAi')}</Link>
          <Link to="/tickets/new" className={buttonClass('primary')}><Plus aria-hidden size={18} /> {t('common.raiseTicket')}</Link>
        </div>}>
        {t('home.firstBody')}
      </EmptyState>
      <Popular items={popular} />
    </div>
  );
}
