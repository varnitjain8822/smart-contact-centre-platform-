import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarCheck,
  CreditCard,
  Factory,
  FileBadge,
  FileText,
  Globe,
  Laptop,
  Luggage,
  Mail,
  ScanFace,
  Timer,
  Database,
  ExternalLink,
  Headphones,
  Landmark,
  LogIn,
  Mic,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { basenameFor } from '../lib/company';
import { RetryBlock } from '../ui/EmptyState';
import { Loading, Skeleton } from '../ui/Skeleton';
import { LanguageSwitch } from '../features/shell/LanguageSwitch';
import { GoogleIcon } from '../features/auth/GoogleSsoButton';
import { useAdminUrl } from '../lib/adminUrl';

interface CompanyItem {
  slug: string;
  name: string;
  sector: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoText: string;
  demo?: boolean;
}

const companyDomainIcon = (slug: string) => {
  switch (slug) {
    case 'sbi':
      return <Landmark size={24} className="text-white" />;
    case 'tatasteel':
      return <Truck size={24} className="text-white" />;
    case 'delhiairport':
      return <Plane size={24} className="text-white" />;
    case 'passportseva':
      return <ShieldCheck size={24} className="text-white" />;
    case 'infosys':
      return <Building2 size={24} className="text-white" />;
    default:
      return <Sparkles size={24} className="text-white" />;
  }
};

const companyBadgeLabel = (slug: string) => {
  switch (slug) {
    case 'sbi':
      return 'Banking & Financial Services';
    case 'tatasteel':
      return 'Steel, Metals & Supply Chain';
    case 'delhiairport':
      return 'Aviation, Flight Ops & Cargo';
    case 'passportseva':
      return 'Official Consular & Public Affairs';
    case 'infosys':
      return 'Global IT & Technology Services';
    default:
      return 'Omnichannel SME Commerce';
  }
};

const companyLiveStatus = (slug: string) => {
  switch (slug) {
    case 'sbi':
      return '24x7 Core Banking • RBI Ombudsman';
    case 'tatasteel':
      return 'Jamshedpur Mill • GPS Lorry Tracking';
    case 'delhiairport':
      return 'IGI T1/T2/T3 • Flight 6E2134 Radar';
    case 'passportseva':
      return 'MEA India • 400+ PSK Network';
    case 'infosys':
      return 'Enterprise IT • Workday & Payslips';
    default:
      return 'Commerce Hub • GST & e-Way API';
  }
};

const companyCapabilities = (slug: string): { icon: LucideIcon; label: string }[] => {
  switch (slug) {
    case 'sbi':
      return [
        { icon: CreditCard, label: 'RuPay & SBI Debit Cards' },
        { icon: Zap, label: 'YONO & UPI Disputes' },
        { icon: Mic, label: 'Hindi / English Voice' },
      ];
    case 'tatasteel':
      return [
        { icon: Factory, label: 'TMT Rebar Grade Fe 550D' },
        { icon: Truck, label: 'GPS Lorry Dispatches' },
        { icon: FileBadge, label: 'Mill Test Certificates' },
      ];
    case 'delhiairport':
      return [
        { icon: Plane, label: 'Flight Radar & Terminals' },
        { icon: ScanFace, label: 'DigiYatra Smart Gate' },
        { icon: Luggage, label: 'Lost & Found / Baggage' },
      ];
    case 'passportseva':
      return [
        { icon: CalendarCheck, label: 'PSK Appointment Booking' },
        { icon: Search, label: 'Police Verification' },
        { icon: Mail, label: 'Speed Post Tracking' },
      ];
    case 'infosys':
      return [
        { icon: Briefcase, label: 'Vendor Invoice Status' },
        { icon: Laptop, label: 'Corporate IT Assets' },
        { icon: FileText, label: 'Payslip & Leave Balances' },
      ];
    default:
      return [
        { icon: Bot, label: '3-Tier Autonomous AI' },
        { icon: Timer, label: 'Dynamic SLA Routing' },
        { icon: Globe, label: 'Chatwoot Human Inboxes' },
      ];
  }
};

export default function CompanyPickerPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const adminUrl = useAdminUrl();

  const q = useQuery({ queryKey: ['companies'], queryFn: () => api.companies().then((r) => r.items as CompanyItem[]) });

  useEffect(() => {
    document.title = `${t('picker.title')} — SmartCC Enterprise Hub`;
  }, [t, i18n.language]);

  const items = q.data ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      const qLower = query.toLowerCase().trim();
      const matchesSearch =
        qLower === '' ||
        c.name.toLowerCase().includes(qLower) ||
        c.sector.toLowerCase().includes(qLower) ||
        c.tagline.toLowerCase().includes(qLower);

      if (!matchesSearch) return false;
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'banking') return c.slug === 'sbi';
      if (selectedFilter === 'industrial') return c.slug === 'tatasteel';
      if (selectedFilter === 'aviation') return c.slug === 'delhiairport';
      if (selectedFilter === 'govt') return c.slug === 'passportseva';
      if (selectedFilter === 'tech') return c.slug === 'infosys' || c.slug === 'smartcc';
      return true;
    });
  }, [items, query, selectedFilter]);

  return (
    <div className="ts relative min-h-dvh flex flex-col overflow-x-hidden">
      {/* Top bar — glass, hairline */}
      <header className="ts-glass sticky top-0 z-40 border-x-0 border-t-0 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg border ts-hair bg-white/[.04]">
              <Sparkles size={16} className="text-white" />
            </span>
            <span className="ts-steel text-[19px] font-semibold tracking-[-0.03em]">SmartCC</span>
          </a>

          <div className="flex items-center gap-2">
            <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn--steel !h-9 !rounded-full !px-4 !text-[13px]">
              Admin portal <ExternalLink size={12} className="opacity-60" />
            </a>
            <LanguageSwitch variant="light" />
          </div>
        </div>
      </header>

      {/* Hero — two columns, like the ThinqScript landing: the pitch, and the product doing its job */}
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div aria-hidden className="ts-glow pointer-events-none absolute inset-0" />
        <div aria-hidden className="ts-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="text-center lg:text-left">
            <p className="ts-label ts-rise">Unified customer support · {items.length || 6} workspaces</p>
            <h1 className="ts-rise ts-rise-2 mt-6 text-[clamp(40px,5.6vw,76px)] font-bold leading-[1.0] tracking-[-0.05em]">
              <span className="block text-white">Ask once.</span>
              <span className="ts-dim block">Get it resolved.</span>
            </h1>
            <p className="ts-rise ts-rise-3 ts-ink2 mx-auto mt-6 max-w-xl text-[17px] leading-relaxed lg:mx-0">
              One help desk for banks, airports, factories and government offices. The AI reads the customer's own records,
              answers in Hindi or English, and hands over to a person when it should.
            </p>
            <div className="ts-rise ts-rise-4 mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#portals" className="ts-btn ts-btn--primary !h-12 !px-6">Explore portals <ArrowRight size={16} /></a>
              <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="ts-btn ts-btn--steel !h-12 !px-6">Agent workspace</a>
            </div>
            <ul className="ts-rise ts-rise-4 ts-ink3 mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] lg:justify-start">
              {['Hindi & English voice', 'Reads live records', 'Human handover'].map((x) => (
                <li key={x} className="flex items-center gap-1.5"><span className="text-[color:var(--ts-gold)]">✓</span>{x}</li>
              ))}
            </ul>
          </div>

          <LiveChats />
        </div>
      </section>

      {/* Find a portal */}
      <section id="portals" className="relative scroll-mt-20 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="ts-label">Pick a portal</p>
          <h2 className="ts-steel mt-4 text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.035em]">Six help desks, one platform</h2>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Search size={18} className="ts-ink3 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a company, sector or workflow — SBI, airport, passport…"
              className="ts-field w-full rounded-2xl py-3.5 pl-11 pr-10 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('picker.clearSearch')}
                className="absolute right-3.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            {[
              { id: 'all', label: `All portals (${items.length || 6})`, icon: null },
              { id: 'banking', label: 'Banking & Finance', icon: Landmark },
              { id: 'industrial', label: 'Steel & Factory', icon: Factory },
              { id: 'aviation', label: 'Airport & Aviation', icon: Plane },
              { id: 'govt', label: 'Passport & Public', icon: ScanFace },
              { id: 'tech', label: 'Enterprise IT & SMB', icon: Laptop },
            ].map((f) => (
              <button key={f.id} type="button" onClick={() => setSelectedFilter(f.id)} aria-pressed={selectedFilter === f.id} className="ts-chip px-4 py-2 transition-colors">
                {f.icon && <f.icon size={13} className="opacity-70" />}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <main id="main" className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6 lg:px-8">
        {q.isPending ? (
          <Loading label={t('common.loading')} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-80 rounded-[18px] !bg-white/[.04]" />)}
          </Loading>
        ) : q.isError ? (
          <div className="mt-4 rounded-2xl bg-white p-4"><RetryBlock onRetry={() => q.refetch()} /></div>
        ) : filteredItems.length === 0 ? (
          <div className="ts-card py-20 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl border ts-hair bg-white/[.04]"><Search size={20} className="ts-ink3" /></span>
            <p className="mt-4 text-lg font-semibold">No portal matches “{query}”</p>
            <p className="ts-ink3 mt-1 text-sm">Try “Banking”, “Airport”, “Tata” or “Passport”.</p>
            <button type="button" onClick={() => { setQuery(''); setSelectedFilter('all'); }} className="ts-btn ts-btn--primary mt-6 !h-10 !text-sm">
              Reset search &amp; filters
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((c) => (
              <li key={c.slug} className="flex min-w-0">
                <div className="ts-card group relative flex w-full flex-col justify-between overflow-hidden p-6 sm:p-7">
                  <div aria-hidden className="absolute inset-x-6 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${c.accentColor || '#fff'}, transparent)` }} />
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl text-white ring-1 ring-white/10"
                        style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}>
                        {companyDomainIcon(c.slug)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border ts-hair bg-white/[.03] px-2.5 py-1 text-[10.5px] text-emerald-300/90">
                        <span className="size-1.5 rounded-full bg-emerald-400" />
                        <span className="ts-mono">{companyLiveStatus(c.slug)}</span>
                      </span>
                    </div>

                    <div className="mt-6">
                      <p className="ts-label !text-[10px] !tracking-[.24em]">{companyBadgeLabel(c.slug)}</p>
                      <h2 className="mt-2 line-clamp-2 min-h-[3.5rem] text-[22px] font-semibold leading-tight tracking-[-0.02em]" title={c.name}>{c.name}</h2>
                      <p className="ts-ink2 mt-2 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed">{c.tagline}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {companyCapabilities(c.slug).map((cap, i) => (
                        <span key={i} className="ts-chip px-2.5 py-1 text-[11px]">
                          <cap.icon size={12} className="shrink-0 opacity-60" />
                          <span>{cap.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-7 border-t ts-hair pt-5">
                    <a href={basenameFor(c.slug)} aria-label={t('picker.enterAria', { name: c.name })} className="ts-btn ts-btn--primary w-full !justify-between">
                      <span>{t('picker.enter')}</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </a>
                    <div className="ts-ink3 mt-3 grid grid-cols-4 gap-1 text-center text-[11.5px] font-medium">
                      <a href={`${basenameFor(c.slug)}/login`} title="Sign in with credentials" className="flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-white/5 hover:text-white"><LogIn size={12} /> Login</a>
                      <a href={`${basenameFor(c.slug)}/login`} title="1-Click Google Single Sign-On" className="flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-white/5 hover:text-white"><GoogleIcon size={12} /> Google</a>
                      <a href={`${basenameFor(c.slug)}/help`} title="Search knowledge articles" className="flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-white/5 hover:text-white"><BookOpen size={12} /> Help</a>
                      <a href={`${basenameFor(c.slug)}/assistant`} title="Talk to Bilingual Voice AI" className="flex items-center justify-center gap-1 rounded-lg py-1.5 hover:bg-white/5 hover:text-white"><Mic size={12} /> Voice AI</a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Architecture */}
        <section className="mt-24">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="ts-label">Core architecture</p>
            <h2 className="ts-steel mt-4 text-[clamp(28px,3.4vw,44px)] font-bold tracking-[-0.035em]">The technology behind SmartCC</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Mic, title: 'Bilingual Voice AI', body: <>Groq Whisper Turbo speech-to-text with browser TTS. Natural Hindi Devanagari replies for Hinglish questions.</> },
              { icon: Database, title: 'Multi-tenant database RAG', body: <>Live customer records — passbooks, lorry GPS, PNRs, payslips — isolated per tenant, with no cross-tenant reads.</> },
              { icon: ShieldCheck, title: 'Google SSO & demo login', body: <>Google sign-in provisions a tenant profile on first use, plus a universal demo login (<code className="ts-mono text-white">xyz@gmail.com / 1234</code>).</> },
              { icon: Headphones, title: 'Chatwoot agent CRM', body: <>Company inboxes, live webhooks, SLA enforcement and bot-to-human handover in real time.</>, link: true },
            ].map((f) => (
              <div key={f.title} className="ts-card flex flex-col p-6">
                <span className="mb-5 grid size-11 place-items-center rounded-xl border ts-hair bg-white/[.04]"><f.icon size={20} className="text-white" /></span>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="ts-ink2 mt-2 flex-1 text-[13px] leading-relaxed">{f.body}</p>
                {f.link && (
                  <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--ts-gold)] hover:brightness-110">
                    Open agent workspace <ArrowRight size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="ts-card mt-10 !transform-none p-8 sm:p-10">
          <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4 lg:divide-x lg:divide-white/[.08]">
            {[
              ['6', 'Enterprise desks', 'Banking, steel, aviation, passport, IT & SME'],
              ['< 1s', 'RAG query latency', 'Sub-second database tool calls'],
              ['100%', 'Tenant isolation', 'Card and account numbers redacted'],
              ['3-tier', 'Autonomous resolution', 'AI resolves, drafts for agents, escalates'],
            ].map(([n, l, d]) => (
              <div key={l}>
                <p className="ts-steel text-4xl font-bold tracking-[-0.03em]">{n}</p>
                <p className="mt-2 text-sm font-semibold">{l}</p>
                <p className="ts-ink3 mt-1 text-xs">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t ts-hair py-8 text-xs">
        <div className="ts-ink3 mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <p>© 2026 SmartCC · Multi-tenant customer support</p>
          <p className="ts-mono">Groq Whisper Turbo · Chatwoot · MongoDB</p>
        </div>
      </footer>
    </div>
  );
}

type Chat = { ticket: string; org: string; ask: string; check: string; reply: string; chips: string[]; secs: string; by: string; voice?: boolean };
const CHATS: Chat[] = [
  { ticket: 'SBI-2207', org: 'STATE BANK · VOICE · हिंदी', voice: true, ask: 'ATM se paise nahi nikle par account se ₹5,000 kat gaye.',
    check: 'checked passbook · txn 08:41 · ATM DEL-0193',
    reply: 'Mil gaya — 25 Oct, 08:41 ka ₹5,000 debit failed dispense hai. Reversal shuru kar diya hai; RBI ke T+5 niyam se 30 Oct tak wapas aa jaayega.',
    chips: ['Dispute raised · ATM', 'Refund by 30 Oct'], secs: '38s', by: 'Resolved by AI · no agent needed' },
  { ticket: 'DEL-5512', org: 'DELHI AIRPORT · EN', ask: 'My bag didn\u2019t come off flight 6E2134. What do I do?',
    check: 'checked PNR X7K2QD · belt 6 · T1 baggage desk',
    reply: 'Found it: your bag missed the connection and arrives on 6E2178 at 19:40. A delivery to your address is booked for tonight.',
    chips: ['PIR filed · DEL-BG-118', 'Home delivery tonight'], secs: '52s', by: 'Resolved by AI · no agent needed' },
  { ticket: 'TSL-0931', org: 'TATA STEEL · VOICE · हिंदी', voice: true, ask: 'Mera Fe 550D ka truck kab tak pahunchega?',
    check: 'checked dispatch LR JSR-LR-778201 · GPS',
    reply: 'Truck JH-05-CD-4421 Ranchi stockyard se 42 km door hai. Aaj shaam 6:30 tak pahunch jaayega; mill test certificate attach kar diya hai.',
    chips: ['ETA 18:30', 'MTC attached'], secs: '27s', by: 'Resolved by AI · no agent needed' },
  { ticket: 'PSK-3380', org: 'PASSPORT SEVA · EN', ask: 'Police verification is pending for 3 weeks. Can someone check?',
    check: 'checked file DL1069…· police station Saket',
    reply: 'The report is with the Saket station since 4 Oct. I\u2019ve escalated it and handed this to an officer who will call you within a day.',
    chips: ['Escalated', 'Handed to an agent'], secs: '1m 04s', by: 'Handed to a person · context passed' },
];

const QUEUED = [
  { ticket: 'INF-7741', ask: 'Payslip for September shows wrong PF.', state: 'agent' },
  { ticket: 'SCC-1206', ask: 'GST invoice not generated for order 5521.', state: 'AI' },
];

/** The hero's product card: conversations play one after another (ask → records check → typing → answer). */
function LiveChats() {
  const [i, setI] = useState(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) { setStep(5); return; }
    // a voice note plays a little longer than a typed message takes to read
    const delays = CHATS[i]?.voice ? [500, 1900, 900, 1300, 2300, 3200] : [500, 900, 900, 1500, 900, 3200];
    const id = window.setTimeout(() => {
      if (step < 5) setStep(step + 1);
      else { setStep(0); setI((n) => (n + 1) % CHATS.length); }
    }, delays[step]);
    return () => window.clearTimeout(id);
  }, [step, i]);
  const c = CHATS[i] ?? CHATS[0]!;
  const show = (n: number) => (step >= n ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2');
  return (
    <div aria-hidden className="ts-rise ts-rise-3 ts-glass relative mx-auto w-full max-w-[700px] overflow-hidden rounded-[18px] shadow-[0_40px_120px_-40px_rgba(120,145,190,.45)]">
      <div className="flex items-center gap-3 border-b ts-hair px-4 py-3">
        <span className="flex gap-1.5">{[0, 1, 2].map((d) => <span key={d} className="size-2.5 rounded-full bg-white/15" />)}</span>
        <span className="ts-mono ts-ink3 text-xs">inbox · {CHATS.length + QUEUED.length} open</span>
        <span className="ts-mono ml-auto text-[11px] text-[color:var(--ts-gold)]">{c.org}</span>
      </div>
      <div className="grid sm:grid-cols-[200px_1fr]">
      {/* Inbox: every ticket in flight; the one playing is lit, earlier ones settled, later ones waiting */}
      <ul className="hidden border-r ts-hair sm:block">
        {CHATS.map((t, n) => {
          const state = n === i ? 'live' : n < i ? 'done' : 'next';
          return (
            <li key={t.ticket}>
              <button type="button" tabIndex={-1} onClick={() => { setI(n); setStep(0); }}
                className={`flex w-full flex-col gap-1 border-b ts-hair px-3.5 py-3 text-left transition-colors ${state === 'live' ? 'bg-white/[.06]' : 'hover:bg-white/[.03]'}`}>
                <span className="flex items-center gap-2">
                  <span className={`size-1.5 shrink-0 rounded-full ${state === 'live' ? 'animate-pulse bg-[color:var(--ts-gold)]' : state === 'done' ? (t.by.startsWith('Handed') ? 'bg-sky-400' : 'bg-emerald-400') : 'bg-white/25'}`} />
                  <span className="ts-mono text-[11px] text-white">{t.ticket}</span>
                  {t.voice && <Mic size={10} className="ts-ink3" />}
                  <span className="ts-mono ts-ink3 ml-auto text-[10px]">{state === 'live' ? 'live' : state === 'done' ? t.secs : 'AI'}</span>
                </span>
                <span className={`line-clamp-1 text-[11.5px] ${state === 'live' ? 'text-white' : 'ts-ink3'}`}>{t.ask}</span>
              </button>
            </li>
          );
        })}
        {QUEUED.map((q) => (
          <li key={q.ticket} className="flex flex-col gap-1 border-b ts-hair px-3.5 py-3 last:border-b-0">
            <span className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-white/25" />
              <span className="ts-mono text-[11px] text-white/80">{q.ticket}</span>
              <span className="ts-mono ts-ink3 ml-auto text-[10px]">{q.state}</span>
            </span>
            <span className="ts-ink3 line-clamp-1 text-[11.5px]">{q.ask}</span>
          </li>
        ))}
      </ul>
      <div className="flex min-h-[340px] flex-col gap-3 px-5 py-5 text-[13.5px] leading-relaxed">
        <span className="ts-mono ts-ink3 -mb-1 text-[11px]">ticket {c.ticket}</span>
        <div className={`max-w-[85%] self-end rounded-2xl rounded-br-md bg-white/[.07] px-4 py-2.5 text-white transition-all duration-500 ${show(1)}`}>
          {c.voice && <VoiceStrip live={step === 1} label="0:04" />}
          {c.voice ? <span className="ts-ink2 mt-1.5 block text-[12.5px] italic">“{c.ask}”</span> : c.ask}
        </div>
        <div className={`ts-mono ts-ink3 flex items-center gap-2 text-[11px] transition-all duration-500 ${show(2)}`}>
          <span className="size-1.5 rounded-full bg-emerald-400" /> {c.check}
        </div>
        {step === 3 ? (
          <div className="flex w-16 gap-1.5 rounded-2xl rounded-bl-md border ts-hair bg-white/[.03] px-4 py-3">
            {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-white/50" style={{ animationDelay: `${d * 120}ms` }} />)}
          </div>
        ) : (
          <div className={`max-w-[90%] rounded-2xl rounded-bl-md border ts-hair bg-white/[.03] px-4 py-2.5 text-[color:var(--ts-ink1)] transition-all duration-500 ${show(4)}`}>
            {c.voice && <VoiceStrip live={step === 4} label="Ask AI · speaking" ai />}
            <span className={c.voice ? 'mt-1.5 block' : ''}>{c.reply}</span>
          </div>
        )}
        <div className={`flex flex-wrap gap-2 pt-1 transition-all duration-500 ${show(5)}`}>
          {c.chips.map((x) => <span key={x} className="ts-chip px-3 py-1 text-[11px]">{x}</span>)}
        </div>
      </div>
      </div>
      <div className="flex items-center justify-between border-t ts-hair px-5 py-3 text-[12px]">
        <span className={`ts-ink3 transition-opacity duration-500 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>{c.by}</span>
        <span className="flex items-center gap-3">
          <span className="flex gap-1">{CHATS.map((_, n) => <span key={n} className={`h-1 rounded-full transition-all ${n === i ? 'w-4 bg-white' : 'w-1.5 bg-white/20'}`} />)}</span>
          <span className={`ts-mono text-white transition-opacity duration-500 ${step >= 5 ? 'opacity-100' : 'opacity-0'}`}>{c.secs}</span>
        </span>
      </div>
    </div>
  );
}

/** A voice note: mic or speaker, bars that move while it plays, and a label. */
function VoiceStrip({ live, label, ai }: { live: boolean; label: string; ai?: boolean }) {
  const bars = [6, 12, 18, 10, 16, 22, 14, 8, 18, 12, 20, 9, 15, 7, 13, 19, 11, 6];
  return (
    <span className="flex items-center gap-2.5">
      <span className={`grid size-6 shrink-0 place-items-center rounded-full ${ai ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
        {ai ? <Sparkles size={12} /> : <Mic size={12} />}
      </span>
      <span className="flex h-6 items-center gap-[3px]">
        {bars.map((h, n) => (
          <span key={n} className={`w-[3px] rounded-full ${ai ? 'bg-[color:var(--ts-gold)]' : 'bg-white/70'} ${live ? 'ts-wave' : ''}`}
            style={{ height: h, animationDelay: `${(n % 6) * 90}ms` }} />
        ))}
      </span>
      <span className="ts-mono ts-ink3 text-[10.5px]">{label}</span>
    </span>
  );
}
