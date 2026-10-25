import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Copy,
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
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { basenameFor } from '../lib/company';
import { RetryBlock } from '../ui/EmptyState';
import { Loading, Skeleton } from '../ui/Skeleton';
import { LanguageSwitch } from '../features/shell/LanguageSwitch';
import { GoogleIcon } from '../features/auth/GoogleSsoButton';

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

const companyCapabilities = (slug: string): { icon: string; label: string }[] => {
  switch (slug) {
    case 'sbi':
      return [
        { icon: '💳', label: 'RuPay & SBI Debit Cards' },
        { icon: '⚡', label: 'YONO & UPI Disputes' },
        { icon: '🎙️', label: 'Hindi / English Voice' },
      ];
    case 'tatasteel':
      return [
        { icon: '🏗️', label: 'TMT Rebar Grade Fe 550D' },
        { icon: '🚛', label: 'GPS Lorry Dispatches' },
        { icon: '📜', label: 'Mill Test Certificates' },
      ];
    case 'delhiairport':
      return [
        { icon: '✈️', label: 'Flight Radar & Terminals' },
        { icon: '🛂', label: 'DigiYatra Smart Gate' },
        { icon: '🧳', label: 'Lost & Found / Baggage' },
      ];
    case 'passportseva':
      return [
        { icon: '🏛️', label: 'PSK Appointment Booking' },
        { icon: '🔍', label: 'Police Verification' },
        { icon: '📮', label: 'Speed Post Tracking' },
      ];
    case 'infosys':
      return [
        { icon: '💼', label: 'Vendor Invoice Status' },
        { icon: '💻', label: 'Corporate IT Assets' },
        { icon: '📄', label: 'Payslip & Leave Balances' },
      ];
    default:
      return [
        { icon: '🤖', label: '3-Tier Autonomous AI' },
        { icon: '⏱️', label: 'Dynamic SLA Routing' },
        { icon: '🌐', label: 'Chatwoot Human Inboxes' },
      ];
  }
};

export default function CompanyPickerPage() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const q = useQuery({ queryKey: ['companies'], queryFn: () => api.companies().then((r) => r.items as CompanyItem[]) });

  useEffect(() => {
    document.title = `${t('picker.title')} — SmartCC Enterprise Hub`;
  }, [t, i18n.language]);

  const items = q.data ?? [];

  const handleCopyCredentials = () => {
    navigator.clipboard?.writeText('xyz@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
    <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Sparkles size={20} className="animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-xl tracking-tight leading-none text-slate-900">
                  SmartCC
                </span>
                <span className="rounded-full bg-sky-100 border border-sky-300/60 px-2 py-0.5 text-[10px] font-bold text-sky-800 uppercase tracking-wide">
                  Enterprise
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                Multi-Tenant Operations Network
              </span>
            </div>
          </div>

          {/* Quick Info & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Universal Login Badge with Copy */}
            <button
              type="button"
              onClick={handleCopyCredentials}
              title="Click to copy universal demo email"
              className="hidden lg:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100/80 px-3.5 py-1.5 text-xs text-slate-700 transition-all shadow-2xs active:scale-95"
            >
              <span className="text-slate-500 font-medium">Universal Login:</span>
              <code className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/60 text-[11px]">
                xyz@gmail.com / 1234
              </code>
              {copied ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <Check size={12} strokeWidth={3} /> Copied!
                </span>
              ) : (
                <Copy size={12} className="text-slate-400 hover:text-slate-600" />
              )}
            </button>

            {/* Google SSO Indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className="grid size-4 place-items-center">
                <GoogleIcon size={13} />
              </span>
              <span>Google SSO Ready</span>
            </div>

            {/* Admin Desk Link */}
            <a
              href="http://localhost:3310"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs"
            >
              <span>Admin Portal</span>
              <ExternalLink size={12} className="text-slate-500" />
            </a>

            <LanguageSwitch variant="light" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-bold text-sky-800 shadow-2xs">
            <Zap size={14} className="text-sky-600" />
            <span>Unified Customer Support Platform • 6 Connected Enterprise Workspaces</span>
          </div>

          <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.12]">
            One Intelligent Platform for India's Critical Operations
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Select any enterprise portal below to experience custom industry workflows, real-time database customer record lookups, and bilingual Hindi & English Voice AI.
          </p>

          {/* Search Box */}
          <div className="mt-8 mx-auto max-w-xl relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company, sector, or workflow (e.g. SBI, Airport, Tata Steel, Passport, IT)..."
              className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 size-5 rounded-full grid place-items-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Portals (6)' },
              { id: 'banking', label: '🏛️ Banking & Finance' },
              { id: 'industrial', label: '🏗️ Steel & Factory' },
              { id: 'aviation', label: '✈️ Airport & Aviation' },
              { id: 'govt', label: '🛂 Passport & Public' },
              { id: 'tech', label: '💻 Enterprise IT & SMB' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFilter(f.id)}
                className={`rounded-full px-4 py-2 transition-all ${
                  selectedFilter === f.id
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <main id="main" className="mx-auto max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-10 w-full">
        {q.isPending ? (
          <Loading label={t('common.loading')} className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-80 rounded-3xl" />
            ))}
          </Loading>
        ) : q.isError ? (
          <div className="mt-4"><RetryBlock onRetry={() => q.refetch()} /></div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
              <Search size={22} />
            </span>
            <p className="mt-4 text-lg font-bold text-slate-900">No enterprise portals match "{query}"</p>
            <p className="mt-1 text-sm text-slate-500">Try searching for keywords like "Banking", "Airport", "Tata", or "Passport".</p>
            <button
              type="button"
              onClick={() => { setQuery(''); setSelectedFilter('all'); }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-sky-600 text-white px-5 py-2 text-xs font-bold hover:bg-sky-700 transition-colors shadow-xs"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((c) => (
              <li key={c.slug} className="min-w-0 flex">
                <div className="group flex flex-col justify-between w-full rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs transition-all duration-300 hover:border-sky-400 hover:shadow-xl hover:-translate-y-1.5 relative overflow-hidden">
                  {/* Brand Color Top Header Strip */}
                  <div
                    className="absolute top-0 inset-x-0 h-2 opacity-90 transition-opacity group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, ${c.primaryColor}, ${c.accentColor})` }}
                  />

                  <div>
                    {/* Top Row: Icon Badge & Status Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <span
                        aria-hidden
                        className="grid size-14 shrink-0 place-items-center rounded-2xl shadow-md text-white transition-transform duration-300 group-hover:scale-105"
                        style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}
                      >
                        {companyDomainIcon(c.slug)}
                      </span>

                      <div className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200/80">
                          {companyBadgeLabel(c.slug)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>{companyLiveStatus(c.slug)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Company Name & Sector */}
                    <div className="mt-5">
                      <h2 className="font-display text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors tracking-tight">
                        {c.name}
                      </h2>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {c.sector}
                      </span>
                      <p className="mt-2.5 text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {c.tagline}
                      </p>
                    </div>

                    {/* Capabilities Tags */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {companyCapabilities(c.slug).map((cap, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                        >
                          <span>{cap.icon}</span>
                          <span>{cap.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Links Footer */}
                  <div className="mt-7 pt-5 border-t border-slate-100">
                    {/* Primary Button */}
                    <a
                      href={basenameFor(c.slug)}
                      className="flex items-center justify-between w-full rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:from-sky-500 hover:to-blue-500 transition-all group-hover:shadow-md"
                    >
                      <span>Enter {c.name}</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
                    </a>

                    {/* Micro-actions row */}
                    <div className="mt-3.5 grid grid-cols-4 gap-1 text-center text-[11px] font-semibold text-slate-600">
                      <a
                        href={`${basenameFor(c.slug)}/login`}
                        className="rounded-lg py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-center gap-1"
                        title="Sign in with credentials"
                      >
                        <LogIn size={12} className="text-slate-400" />
                        <span>Login</span>
                      </a>

                      <a
                        href={`${basenameFor(c.slug)}/login`}
                        className="rounded-lg py-1.5 hover:bg-slate-100 text-emerald-700 hover:text-emerald-800 transition-colors flex items-center justify-center gap-1 font-bold"
                        title="1-Click Google Single Sign-On"
                      >
                        <GoogleIcon size={12} />
                        <span>Google</span>
                      </a>

                      <a
                        href={`${basenameFor(c.slug)}/help`}
                        className="rounded-lg py-1.5 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center justify-center gap-1"
                        title="Search knowledge articles"
                      >
                        <BookOpen size={12} className="text-slate-400" />
                        <span>Help</span>
                      </a>

                      <a
                        href={`${basenameFor(c.slug)}/assistant`}
                        className="rounded-lg py-1.5 hover:bg-sky-50 text-sky-700 hover:text-sky-800 transition-colors flex items-center justify-center gap-1 font-bold"
                        title="Talk to Bilingual Voice AI"
                      >
                        <Mic size={12} className="text-sky-600" />
                        <span>Voice AI</span>
                      </a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Feature Highlights Grid */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
              Core Architecture
            </span>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Technology Behind SmartCC
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition-all">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 mb-4 border border-sky-100">
                <Mic size={22} />
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">Bilingual Voice AI</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Groq Whisper Turbo speech-to-text with browser TTS. Natural Hindi Devanagari responses for Hinglish inquiries.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition-all">
              <span className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100">
                <Database size={22} />
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">Multi-Tenant Database RAG</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Live customer records (passbooks, GPS lorry tracking, PNRs, payslips) isolated with strict tenant security and zero leaks.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition-all">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
                <ShieldCheck size={22} />
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">Google SSO & Universal Demo</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Instant Google OAuth sign-in with automatic tenant profile provisioning, plus universal credentials (<code className="font-mono text-emerald-700 bg-emerald-100/60 px-1 rounded">xyz@gmail.com / 1234</code>).
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-slate-300 transition-all">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100">
                <Headphones size={22} />
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">Chatwoot Agent CRM</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Dedicated company inboxes, live webhooks, SLA enforcement, and seamless bot-to-human agent escalation in real-time.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Strip */}
        <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-x-0 lg:divide-x divide-slate-100">
            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-sky-600">6</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Enterprise Desks</p>
              <p className="text-xs text-slate-500 mt-0.5">Banking, Steel, Aviation, Passport, IT & SME</p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-sky-600">&lt; 1s</p>
              <p className="mt-1 text-sm font-bold text-slate-900">RAG Query Latency</p>
              <p className="text-xs text-slate-500 mt-0.5">Sub-second database tool execution</p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-sky-600">100%</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Tenant Isolation</p>
              <p className="text-xs text-slate-500 mt-0.5">Automated regulatory card & account redaction</p>
            </div>

            <div>
              <p className="font-display text-3xl sm:text-4xl font-black text-sky-600">3-Tier</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Autonomous Resolution</p>
              <p className="text-xs text-slate-500 mt-0.5">Direct AI resolve, agent drafts & escalations</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SmartCC Multi-Tenant Enterprise Customer Support Ecosystem.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by Groq Whisper Turbo</span>
            <span>•</span>
            <span>Chatwoot Rails & Sidekiq</span>
            <span>•</span>
            <span>MongoDB Multi-Tenancy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
