import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BookOpen,
  Building2,
  ExternalLink,
  Landmark,
  LogIn,
  Mic,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { basenameFor } from '../lib/company';
import { RetryBlock } from '../ui/EmptyState';
import { Loading, Skeleton } from '../ui/Skeleton';
import { LanguageSwitch } from '../features/shell/LanguageSwitch';
import { ThemeToggle } from '../features/shell/ThemeToggle';
import { GoogleIcon } from '../features/auth/GoogleSsoButton';

const companyDomainIcon = (slug: string) => {
  switch (slug) {
    case 'sbi':
      return <Landmark size={22} className="text-white" />;
    case 'tatasteel':
      return <Truck size={22} className="text-white" />;
    case 'delhiairport':
      return <Plane size={22} className="text-white" />;
    case 'passportseva':
      return <ShieldCheck size={22} className="text-white" />;
    case 'infosys':
      return <Building2 size={22} className="text-white" />;
    default:
      return <Sparkles size={22} className="text-white" />;
  }
};

const companyBadgeLabel = (slug: string) => {
  switch (slug) {
    case 'sbi':
      return 'Banking & Finance';
    case 'tatasteel':
      return 'Steel & Supply Chain';
    case 'delhiairport':
      return 'Aviation & Airport Ops';
    case 'passportseva':
      return 'Official Consular Portal';
    case 'infosys':
      return 'Enterprise IT & Services';
    default:
      return 'Omnichannel AI Support';
  }
};

const companyCapabilities = (slug: string): string[] => {
  switch (slug) {
    case 'sbi':
      return ['💳 RuPay Debit Cards', '⚡ YONO & UPI Dispute', '🗣️ Hindi/Eng Voice'];
    case 'tatasteel':
      return ['🏗️ TMT Rebar Tracking', '🚛 GPS Lorry LR', '📜 Mill Test Certs'];
    case 'delhiairport':
      return ['✈️ Flight 6E2134 Radar', '🛂 DigiYatra T3 Gate', '🧳 Luggage Belts'];
    case 'passportseva':
      return ['🏛️ PSK Appointments', '🔍 Police Verification', '📮 Speed Post'];
    case 'infosys':
      return ['💻 Payslips & Leaves', '💼 Vendor Invoicing', '🛡️ IT Asset Health'];
    default:
      return ['🤖 Autonomous Bot', '⏱️ 12m Dynamic SLA', '🌐 Omnichannel Hub'];
  }
};

export default function CompanyPickerPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const q = useQuery({ queryKey: ['companies'], queryFn: () => api.companies().then((r) => r.items) });

  useEffect(() => {
    document.title = `${t('picker.title')} — SmartCC Enterprise`;
  }, [t, i18n.language]);

  const items = q.data ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      const matchesSearch =
        query.trim() === '' ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.sector.toLowerCase().includes(query.toLowerCase()) ||
        c.tagline.toLowerCase().includes(query.toLowerCase());

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
    <div className="min-h-dvh bg-bg text-ink flex flex-col">
      {/* Top Navigation Banner */}
      <header className="sticky top-0 z-30 border-b border-sky-400/20 bg-gradient-to-r from-[#0082f5] via-[#00b9f5] to-[#00d2ff] text-white shadow-sm">
        <div className="mx-auto flex h-14 md:h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-sky-600 shadow-sm font-bold">
              <Sparkles size={18} />
            </span>
            <div>
              <span className="font-display font-black text-lg md:text-xl tracking-tight leading-none text-white block">
                SmartCC
              </span>
              <span className="text-[10px] text-white/80 font-medium tracking-wide uppercase">Enterprise Network</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Universal Login Badge */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs backdrop-blur-xs text-white/95">
              <span>Universal Login:</span>
              <code className="font-mono font-bold bg-white/25 px-1.5 py-0.5 rounded text-[11px]">xyz@gmail.com / 1234</code>
            </div>

            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-xs font-semibold text-white shadow-xs">
              <span className="grid size-4 place-items-center rounded-full bg-white text-[10px]">
                <GoogleIcon size={12} />
              </span>
              <span>Google SSO Enabled</span>
            </div>

            <a
              href="http://localhost:3310"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-all"
            >
              <span>Admin Portal</span>
              <ExternalLink size={12} />
            </a>

            <LanguageSwitch variant="light" />
            <ThemeToggle variant="light" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-500/10 via-sky-400/5 to-transparent pt-10 pb-8 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-2xs">
            <Zap size={13} className="text-sky-600" />
            <span>Unified Enterprise Support Hub • 6 Active Workspaces</span>
          </div>

          <h1 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-ink leading-[1.15]">
            One Intelligent Platform for India's Critical Operations
          </h1>

          <p className="mt-3.5 text-base sm:text-lg text-ink-2 max-w-2xl mx-auto leading-relaxed">
            Choose any enterprise portal below to experience custom industry workflows, real-time database record lookups, and bilingual Hindi & English Voice AI.
          </p>

          {/* Search Box */}
          <div className="mt-6 mx-auto max-w-lg relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, sector, or workflow (e.g. Banking, Airport, Steel, Passport, IT)..."
              className="w-full rounded-full border border-line bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-muted shadow-sm transition-all focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Desks' },
              { id: 'banking', label: 'Banking & Finance' },
              { id: 'industrial', label: 'Steel & Logistics' },
              { id: 'aviation', label: 'Aviation & Airport' },
              { id: 'govt', label: 'Govt & Passport' },
              { id: 'tech', label: 'Enterprise IT & AI' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`rounded-full px-3.5 py-1.5 transition-all ${
                  selectedFilter === f.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-surface border border-line text-ink-2 hover:bg-surface-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <main id="main" className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-6 w-full">
        {q.isPending ? (
          <Loading label={t('common.loading')} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </Loading>
        ) : q.isError ? (
          <div className="mt-4"><RetryBlock onRetry={() => q.refetch()} /></div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-ink">No enterprise portals match "{query}"</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setSelectedFilter('all'); }}
              className="mt-3 text-sm font-semibold text-sky-600 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((c) => (
              <li key={c.slug} className="min-w-0 flex">
                <div
                  className="group flex flex-col justify-between w-full rounded-2xl border border-line bg-surface p-6 shadow-sm transition-all hover:border-sky-500/50 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1.5 opacity-80"
                    style={{ background: `linear-gradient(90deg, ${c.primaryColor}, ${c.accentColor})` }}
                  />

                  <div>
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        aria-hidden
                        className="grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm text-white"
                        style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}
                      >
                        {companyDomainIcon(c.slug)}
                      </span>
                      <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted border border-line/60">
                        {companyBadgeLabel(c.slug)}
                      </span>
                    </div>

                    {/* Company Name & Sector */}
                    <div className="mt-4">
                      <h2 className="font-display text-xl font-black text-ink group-hover:text-sky-600 transition-colors">
                        {c.name}
                      </h2>
                      <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mt-0.5">
                        {c.sector}
                      </span>
                      <p className="mt-2 text-sm text-ink-2 leading-relaxed line-clamp-2">
                        {c.tagline}
                      </p>
                    </div>

                    {/* Capabilities Tags */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {companyCapabilities(c.slug).map((cap, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-surface-2/80 border border-line/60 px-2 py-0.5 text-[10px] font-medium text-ink-2"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Links / Action Footer */}
                  <div className="mt-6 pt-4 border-t border-line/60">
                    <a
                      href={basenameFor(c.slug)}
                      className="flex items-center justify-between w-full rounded-xl bg-gradient-to-r from-sky-500/10 to-sky-400/5 px-4 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:from-sky-500/20 hover:to-sky-400/15 border border-sky-500/20 transition-all shadow-2xs group-hover:border-sky-500/40"
                    >
                      <span>Enter {c.name} &gt;</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </a>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted px-1">
                      <a href={`${basenameFor(c.slug)}/login`} className="hover:text-ink transition-colors flex items-center gap-1 font-medium">
                        <LogIn size={11} /> Login
                      </a>
                      <a href={`${basenameFor(c.slug)}/login`} className="hover:text-emerald-600 transition-colors flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <GoogleIcon size={12} /> Google SSO
                      </a>
                      <a href={`${basenameFor(c.slug)}/help`} className="hover:text-ink transition-colors flex items-center gap-1 font-medium">
                        <BookOpen size={11} /> Help
                      </a>
                      <a href={`${basenameFor(c.slug)}/assistant`} className="hover:text-sky-600 transition-colors flex items-center gap-1 font-semibold text-sky-600">
                        <Mic size={11} /> Voice AI
                      </a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Bottom Platform Strengths */}
        <section className="mt-14 rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-display text-2xl sm:text-3xl font-black text-sky-600">6</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-ink">Enterprise Portals</p>
              <p className="text-[11px] text-muted">Banking, Steel, Airport, Passport, IT & SMB</p>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-black text-sky-600">Bilingual</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-ink">Hindi & English Voice</p>
              <p className="text-[11px] text-muted">Groq Whisper Turbo STT + Auto TTS</p>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-black text-sky-600">&lt; 1s</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-ink">RAG Database Lookups</p>
              <p className="text-[11px] text-muted">Passbooks, LR dispatches, PNRs & Payslips</p>
            </div>
            <div>
              <p className="font-display text-2xl sm:text-3xl font-black text-sky-600">3-Tier</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold text-ink">Autonomous AI Resolution</p>
              <p className="text-[11px] text-muted">Auto-resolve, agent drafts & escalations</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-line py-6 text-center text-xs text-muted">
        SmartCC Multi-Tenant Enterprise Customer Support Platform • Powered by Groq Whisper & Chatwoot
      </footer>
    </div>
  );
}
