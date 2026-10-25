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
      <header className="ts-glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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

      {/* Hero */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-14">
        <div aria-hidden className="ts-glow pointer-events-none absolute inset-0" />
        <div aria-hidden className="ts-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="ts-label">Unified customer support · 6 connected workspaces</p>
          <h1 className="mt-6 text-[clamp(38px,6vw,72px)] font-bold leading-[1.02] tracking-[-0.045em]">
            <span className="block text-white">One platform for</span>
            <span className="ts-dim block">India's critical operations</span>
          </h1>
          <p className="ts-ink2 mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed">
            Pick a portal to try its industry workflows, live customer record lookups and bilingual Hindi &amp; English voice AI.
          </p>

          <div className="relative mx-auto mt-10 max-w-xl">
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
