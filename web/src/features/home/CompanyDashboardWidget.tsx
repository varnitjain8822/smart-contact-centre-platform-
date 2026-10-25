import { Link } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  Landmark,
  Mic,
  Plane,
  QrCode,
  ShieldCheck,
  Sparkles,
  TicketPlus,
  Truck,
} from 'lucide-react';
import { company } from '../../lib/company';

export function CompanyDashboardWidget() {
  const current = company();
  const slug = current.slug;

  switch (slug) {
    case 'sbi':
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-600/20 bg-gradient-to-br from-[#002D62]/5 via-sky-500/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#002D62] to-[#00A3E0] text-white shadow-sm">
                <Landmark size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">State Bank of India — Banking Hub</h3>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    KYC Compliant
                  </span>
                </div>
                <p className="text-xs text-ink-2">Regular Savings A/c •••• 8821 • Andheri East Branch</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">Available Balance</span>
                <span className="font-mono text-xl font-black text-ink">₹84,250.60</span>
              </div>
            </div>
          </div>

          {/* Quick Banking Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'View Passbook & Txns',
                icon: <FileText size={15} className="text-[#00A3E0]" />,
                to: '/tickets/new?subject=Passbook+and+Recent+Transactions+Inquiry',
                badge: 'Live',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Card Hotlisting / Block',
                icon: <CreditCard size={15} className="text-amber-600" />,
                to: '/tickets/new?subject=Block+Debit+Card+Hotlisting',
                badge: 'Active 2207',
                badgeTone: 'sky' as const,
              },
              {
                label: 'UPI Dispute Auto-Reversal',
                icon: <CheckCircle2 size={15} className="text-emerald-600" />,
                to: '/tickets/new?subject=UPI+Failed+Transaction+Reversal',
                badge: 'T+5 Rule',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Voice Banking Assistant',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: 'Hindi/Eng',
                badgeTone: 'sky' as const,
              },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  {action.badge && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      );

    case 'tatasteel':
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-slate-900/5 via-sky-900/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#0f172a] to-[#0284c7] text-white shadow-sm">
                <Truck size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">Tata Steel — Dealer Consignment Hub</h3>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    In Transit
                  </span>
                </div>
                <p className="text-xs text-ink-2">Order: TSO-26-104512 • Tata Tiscon 550D (24.5 Tonnes)</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">Lorry Receipt (LR)</span>
                <span className="font-mono text-lg font-bold text-sky-600">JSR-LR-778201</span>
              </div>
            </div>
          </div>

          {/* Quick Logistics Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Track Lorry Receipt (LR)',
                icon: <Truck size={15} className="text-sky-600" />,
                to: '/tickets/new?subject=Track+Steel+Consignment+Lorry+Receipt',
                badge: 'ETA 18:30',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Mill Test Certificate (MTC)',
                icon: <FileCheck size={15} className="text-emerald-600" />,
                to: '/tickets/new?subject=Download+Mill+Test+Certificate+MTC',
                badge: 'Verified',
                badgeTone: 'sky' as const,
              },
              {
                label: 'GST E-Way Bill Clearance',
                icon: <FileText size={15} className="text-amber-600" />,
                to: '/tickets/new?subject=GST+E-Way+Bill+Verification',
                badge: '24108892',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Logistics Voice AI',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: 'Bilingual',
                badgeTone: 'sky' as const,
              },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  {action.badge && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      );

    case 'delhiairport':
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-600/5 via-indigo-600/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#0284c7] to-[#0f172a] text-white shadow-sm">
                <Plane size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">Delhi Airport (DEL) — Passenger Hub</h3>
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    Terminal T3
                  </span>
                </div>
                <p className="text-xs text-ink-2">Flight 6E-2134 (DEL ➔ BOM) • Gate 34B • Baggage Belt 06</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">Boarding Status</span>
                <span className="font-mono text-lg font-bold text-emerald-600">On Time (14:20)</span>
              </div>
            </div>
          </div>

          {/* Quick Airport Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Live Flight Status & Radar',
                icon: <Plane size={15} className="text-sky-600" />,
                to: '/tickets/new?subject=Flight+Status+and+Gate+Inquiry',
                badge: 'Live Gates',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'DigiYatra Biometric Pass',
                icon: <QrCode size={15} className="text-indigo-600" />,
                to: '/tickets/new?subject=DigiYatra+Fast-Track+Enrollment',
                badge: 'T1/T2/T3',
                badgeTone: 'sky' as const,
              },
              {
                label: 'Lost Luggage & Carousel',
                icon: <CheckCircle2 size={15} className="text-amber-600" />,
                to: '/tickets/new?subject=Baggage+Belt+Lost+Property+Claim',
                badge: 'Belt 06',
                badgeTone: 'amber' as const,
              },
              {
                label: 'Airport Voice Assistant',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: '24/7 Ops',
                badgeTone: 'sky' as const,
              },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  {action.badge && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      );

    case 'passportseva':
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0a1931]/5 via-amber-500/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#0a1931] to-[#150050] text-amber-400 shadow-sm">
                <ShieldCheck size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">Passport Seva — Citizen Consular Hub</h3>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    PV Clear
                  </span>
                </div>
                <p className="text-xs text-ink-2">File: DL1069210456726 • PSK R.K. Puram Appointment Complete</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">Speed Post Tracking</span>
                <span className="font-mono text-lg font-bold text-amber-600">ED829103948IN</span>
              </div>
            </div>
          </div>

          {/* Quick Passport Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Track Passport Status',
                icon: <FileCheck size={15} className="text-emerald-600" />,
                to: '/tickets/new?subject=Check+Passport+File+Dispatch+Status',
                badge: 'Dispatched',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'PSK Appointment Slip',
                icon: <Calendar size={15} className="text-sky-600" />,
                to: '/tickets/new?subject=Download+PSK+POPSK+Appointment+Receipt',
                badge: 'ARN Slip',
                badgeTone: 'sky' as const,
              },
              {
                label: 'Police Verification Mode',
                icon: <ShieldCheck size={15} className="text-amber-600" />,
                to: '/tickets/new?subject=Police+Verification+Stage+Inquiry',
                badge: 'Verified',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Consular Voice Assistant',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: 'Hindi/Eng',
                badgeTone: 'sky' as const,
              },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  {action.badge && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      );

    case 'infosys':
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-600/20 bg-gradient-to-br from-[#005587]/5 via-sky-500/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-[#005587] to-[#007cc3] text-white shadow-sm">
                <Building2 size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">Infosys — Employee & Supplier Hub</h3>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Active SEZ
                  </span>
                </div>
                <p className="text-xs text-ink-2">Employee ID: INFY-782190 • Bangalore SEZ Phase 2</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">Sep 2026 Net Salary</span>
                <span className="font-mono text-xl font-black text-emerald-600">₹1,18,400</span>
              </div>
            </div>
          </div>

          {/* Quick Infosys Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Download Payslip',
                icon: <FileText size={15} className="text-sky-600" />,
                to: '/tickets/new?subject=Payslip+Generation+and+PF+Breakup',
                badge: 'Sep 2026',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Leave Balance & Apply',
                icon: <Calendar size={15} className="text-indigo-600" />,
                to: '/tickets/new?subject=Apply+for+Earned+or+Sick+Leave',
                badge: '14 Earned',
                badgeTone: 'sky' as const,
              },
              {
                label: 'Vendor PO Invoicing',
                icon: <CheckCircle2 size={15} className="text-emerald-600" />,
                to: '/tickets/new?subject=Vendor+PO+Invoice+Payment+Status',
                badge: 'PO Cleared',
                badgeTone: 'emerald' as const,
              },
              {
                label: 'Workplace IT Voice AI',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: 'Global Desk',
                badgeTone: 'sky' as const,
              },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                    {action.icon}
                  </span>
                  {action.badge && (
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      {action.badge}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      );

    default: // smartcc
      return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 via-sky-400/5 to-surface p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-r from-[#0082f5] to-[#00b9f5] text-white shadow-sm">
                <Sparkles size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-ink">SmartCC Support Platform</h3>
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    Voice AI Active
                  </span>
                </div>
                <p className="text-xs text-ink-2">Omnichannel AI customer service for accounts, compliance & logistics</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="block text-[11px] text-muted uppercase font-medium">First Response SLA</span>
                <span className="font-mono text-lg font-bold text-emerald-600">&lt; 12 mins</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: 'Voice AI Assistant',
                icon: <Mic size={15} className="text-sky-600 animate-pulse" />,
                to: '/assistant',
                badge: 'Hindi/Eng',
              },
              {
                label: 'Raise New Ticket',
                icon: <TicketPlus size={15} className="text-indigo-600" />,
                to: '/tickets/new',
                badge: 'Instant Triage',
              },
              {
                label: 'Browse Knowledge Base',
                icon: <BookOpen size={15} className="text-amber-600" />,
                to: '/help',
                badge: 'Verified RAG',
              },
              {
                label: 'Admin Portal (Chatwoot)',
                icon: <Building2 size={15} className="text-emerald-600" />,
                to: 'http://localhost:3310',
                badge: 'Port 3310',
              },
            ].map((action, i) => (
              action.to.startsWith('http') ? (
                <a
                  key={i}
                  href={action.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                      {action.icon}
                    </span>
                    {action.badge && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                    {action.label}
                  </span>
                </a>
              ) : (
                <Link
                  key={i}
                  to={action.to}
                  className="flex flex-col justify-between rounded-xl border border-line bg-surface p-3 transition-all hover:border-sky-500 hover:shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-7 place-items-center rounded-lg bg-surface-2 group-hover:scale-105 transition-transform">
                      {action.icon}
                    </span>
                    {action.badge && (
                      <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold text-ink group-hover:text-sky-600 transition-colors">
                    {action.label}
                  </span>
                </Link>
              )
            ))}
          </div>
        </div>
      );
  }
}
