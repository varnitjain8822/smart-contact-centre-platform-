import type { ReactNode } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  FileCheck,
  Landmark,
  Plane,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { SlaRing } from '../../ui/SlaRing';

export interface CompanyThemeConfig {
  slug: string;
  badge: string;
  badgeIcon: ReactNode;
  title: string;
  subtitle: string;
  features: Array<{ text: string; sub?: string }>;
  accentColor: string;
  gradientBg: string;
  previewWidget: ReactNode;
}

export function getCompanyTheme(slug: string): CompanyThemeConfig {
  switch (slug) {
    case 'sbi':
      return {
        slug: 'sbi',
        badge: 'State Bank of India • Official Banking Portal',
        badgeIcon: <Landmark size={14} className="text-[#00A3E0]" />,
        title: 'The Banker to Every Indian',
        subtitle:
          'Secure internet & mobile banking support portal. Instant account summary, card controls, UPI dispute resolution, and 24/7 bilingual AI banking assistance.',
        accentColor: '#002D62',
        gradientBg: 'from-[#002D62] via-[#001D40] to-[#0a1128]',
        features: [
          { text: 'RBI Regulated Bank-Grade 256-bit Security', sub: 'Multi-layer transaction authentication' },
          { text: 'Instant YONO, UPI & ATM Dispute Reversal', sub: 'T+5 auto-reversal compensation tracking' },
          { text: 'Real-Time Passbook & KYC Updation', sub: 'Self-declaration via portal or YONO' },
        ],
        previewWidget: (
          <div className="flex flex-col gap-3">
            {/* SBI Platinum Debit Card Mock */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-[#002D62] via-[#004b99] to-[#00A3E0] p-5 text-white shadow-xl ring-1 ring-white/20">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-wider">STATE BANK OF INDIA</span>
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase backdrop-blur-xs">
                  Platinum
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="size-8 rounded-sm bg-amber-300/80 ring-1 ring-amber-500/50 shadow-inner" />
                <span className="text-xs text-white/80 font-mono tracking-widest">((( • )))</span>
              </div>
              <p className="mt-4 font-mono text-base font-semibold tracking-widest drop-shadow-sm">
                •••• •••• •••• 8821
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/90">
                <div>
                  <span className="block text-[9px] text-white/60 uppercase">Account Holder</span>
                  <span className="font-semibold">RAHUL SHARMA</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] text-white/60 uppercase">Valid Thru</span>
                  <span className="font-semibold font-mono">08/29</span>
                </div>
              </div>
            </div>

            {/* Account Slip */}
            <div className="rounded-xl border border-sky-500/20 bg-surface/90 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 size={13} />
                  </span>
                  <span className="text-xs font-bold text-ink">Savings A/c: •••• 8821</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  KYC Compliant
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-line/60 pt-2">
                <span className="text-xs text-muted">Available Balance</span>
                <span className="font-mono text-base font-bold text-ink">₹84,250.60</span>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              <ShieldAlert size={13} className="shrink-0" />
              <span>SBI never asks for your PIN, OTP or Net Banking password.</span>
            </p>
          </div>
        ),
      };

    case 'tatasteel':
      return {
        slug: 'tatasteel',
        badge: 'Tata Steel • Industrial Supply & Dealer Portal',
        badgeIcon: <Truck size={14} className="text-[#0369a1]" />,
        title: '#WeAlsoMakeTomorrow',
        subtitle:
          'Authorized B2B dealer, builder and contractor consignment management. Live lorry dispatch tracking, mill test certificates (MTC), and automated shipment support.',
        accentColor: '#0f172a',
        gradientBg: 'from-[#0f172a] via-[#1e293b] to-[#0c4a6e]',
        features: [
          { text: 'Live TMT Rebar & Commercial Steel Tracking', sub: 'Tata Tiscon 550D, Structura & Astrum orders' },
          { text: 'GPS Lorry Route & Transit Tracking (LR)', sub: 'Real-time truck location and ETA at stockyard' },
          { text: 'Mill Test Certificates & GST E-Way Bills', sub: 'Instant digital verification for dealer billing' },
        ],
        previewWidget: (
          <div className="flex flex-col gap-3">
            {/* Tata Steel Dispatch Slip */}
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-sky-500/20 text-sky-400">
                    <Truck size={16} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-200">Order: TSO-26-104512</span>
                    <span className="block text-[10px] text-slate-400">Tata Tiscon 550D • 24.5 Tonnes</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  In Transit
                </span>
              </div>

              <div className="mt-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Lorry Receipt (LR)</span>
                  <span className="font-mono font-bold text-sky-400">JSR-LR-778201</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle Number</span>
                  <span className="font-mono text-slate-200">JH-05-CD-4421</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Route</span>
                  <span className="text-slate-200 font-medium">Jamshedpur Mill Works ➔ Ranchi Stockyard</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-[11px]">
                  <span className="text-slate-400">Estimated Delivery</span>
                  <span className="font-bold text-amber-400">Today, 18:30 IST</span>
                </div>
              </div>
            </div>

            {/* E-way Bill Chip */}
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface/90 px-3.5 py-2.5 shadow-sm text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <FileCheck size={14} className="text-emerald-600" /> E-Way Bill: 241088921045
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Verified Valid
              </span>
            </div>
          </div>
        ),
      };

    case 'delhiairport':
      return {
        slug: 'delhiairport',
        badge: 'Indira Gandhi International Airport • DEL',
        badgeIcon: <Plane size={14} className="text-[#0284c7]" />,
        title: 'Terminal 1, 2 & 3 Passenger Gateway',
        subtitle:
          'Your 24/7 aviation operations & passenger companion. Live flight tracking, DigiYatra biometric gate entry, baggage belt assignment, and terminal navigation assistance.',
        accentColor: '#0284c7',
        gradientBg: 'from-[#0369a1] via-[#0284c7] to-[#0f172a]',
        features: [
          { text: 'Live Flight Departures, Arrivals & Radar', sub: 'Real-time schedule, gate changes & delay alerts' },
          { text: 'Fast-Track DigiYatra Biometric Gate Access', sub: 'Seamless contactless entry at T1, T2 & T3' },
          { text: 'Baggage Belts & 24/7 Lost Property', sub: 'Instant luggage carousel lookup upon arrival' },
        ],
        previewWidget: (
          <div className="flex flex-col gap-3">
            {/* Digital Boarding Pass */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-sky-900 to-indigo-950 p-5 text-white shadow-xl ring-1 ring-white/15">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-sky-500/20 text-sky-400">
                    <Plane size={16} />
                  </span>
                  <span className="font-bold text-sm">IndiGo • Flight 6E-2134</span>
                </div>
                <span className="rounded-full bg-sky-400/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-300">
                  On Time
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-2xl font-black tracking-tight">DEL</span>
                  <span className="block text-[10px] text-white/70">New Delhi</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/60">Non-stop • 2h 10m</span>
                  <div className="my-1 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-sky-400" />
                    <span className="h-0.5 w-16 bg-gradient-to-r from-sky-400 to-indigo-400" />
                    <Plane size={11} className="text-sky-300 rotate-90" />
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black tracking-tight">BOM</span>
                  <span className="block text-[10px] text-white/70">Mumbai</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-1.5">
                  <span className="block text-[9px] text-white/60">Terminal</span>
                  <span className="font-bold text-sky-300">T3</span>
                </div>
                <div className="rounded-lg bg-white/5 p-1.5">
                  <span className="block text-[9px] text-white/60">Gate</span>
                  <span className="font-bold text-amber-300">34B</span>
                </div>
                <div className="rounded-lg bg-white/5 p-1.5">
                  <span className="block text-[9px] text-white/60">Baggage Belt</span>
                  <span className="font-bold text-emerald-300">06</span>
                </div>
              </div>
            </div>

            {/* DigiYatra badge */}
            <div className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-surface/90 px-3.5 py-2.5 shadow-sm text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <QrCode size={14} className="text-sky-600" /> DigiYatra Fast-Track Ready
              </span>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                Pre-Cleared
              </span>
            </div>
          </div>
        ),
      };

    case 'passportseva':
      return {
        slug: 'passportseva',
        badge: 'Passport Seva • PSP Division, MEA',
        badgeIcon: <ShieldCheck size={14} className="text-emerald-600" />,
        title: 'Ministry of External Affairs (Govt. of India)',
        subtitle:
          'Official Citizen Consular, Passport & Visa Services. Schedule PSK & POPSK appointments, verify police verification status, and monitor Speed Post dispatch.',
        accentColor: '#0c1e3d',
        gradientBg: 'from-[#0a1931] via-[#0c1e3d] to-[#150050]',
        features: [
          { text: 'Nationwide PSK & Post Office PSK (POPSK)', sub: 'Appointment rescheduling & slot verification' },
          { text: '2-Factor DOB Protected File Tracking', sub: 'Strict privacy safeguarding citizen data' },
          { text: 'Speed Post Passport Dispatch & Delivery', sub: 'Direct integration with India Post tracking' },
        ],
        previewWidget: (
          <div className="flex flex-col gap-3">
            {/* Passport Seva Official Status Card */}
            <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-[#071326] p-5 text-white shadow-xl ring-1 ring-amber-500/20">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-amber-500/20 text-amber-400">
                    <Award size={16} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-amber-200">File: DL1069210456726</span>
                    <span className="block text-[10px] text-white/60">Type: Normal (36 Pages) • Adult</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Dispatched
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-white/90">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
                  <span>PSK R.K. Puram Appointment: Cleared</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
                  <span>Police Verification: Clear (Vasant Kunj PS)</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="grid size-4 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">✓</span>
                  <span>Passport Printed & Handed over to India Post</span>
                </div>

                <div className="mt-2 rounded-lg bg-white/5 p-2.5 border border-white/10 flex justify-between items-center text-[11px]">
                  <span className="text-white/70">Speed Post Tracking</span>
                  <span className="font-mono font-bold text-amber-300">ED829103948IN</span>
                </div>
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
              <ShieldCheck size={13} className="shrink-0" />
              <span>Official Government Portal • Compliant with MEA Digital Guidelines</span>
            </p>
          </div>
        ),
      };

    case 'infosys':
      return {
        slug: 'infosys',
        badge: 'Infosys • Global Enterprise Services',
        badgeIcon: <Building2 size={14} className="text-[#007cc3]" />,
        title: 'Navigate Your Next',
        subtitle:
          'Global employee, consultant & supplier operations hub. Automated payslips, leave tracking, corporate vendor invoicing, and 24/7 IT workplace assistance.',
        accentColor: '#007cc3',
        gradientBg: 'from-[#005587] via-[#007cc3] to-[#0f172a]',
        features: [
          { text: 'Enterprise Single Sign-On (SSO)', sub: 'Secure identity access with Zero-Trust compliance' },
          { text: 'Automated Vendor PO & Fast-Pay Invoicing', sub: 'Direct verification for corporate suppliers' },
          { text: 'Global Delivery Center IT & HR Helpdesk', sub: 'Instant support across Bangalore, Pune & worldwide' },
        ],
        previewWidget: (
          <div className="flex flex-col gap-3">
            {/* Infosys Employee & Vendor Hub Mock */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#005587] p-5 text-white shadow-xl ring-1 ring-sky-500/30">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-sky-500/20 text-sky-400">
                    <Building2 size={16} />
                  </span>
                  <div>
                    <span className="text-xs font-bold text-sky-200">Employee ID: INFY-782190</span>
                    <span className="block text-[10px] text-white/60">Bangalore SEZ Phase 2</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Active
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                  <span className="block text-[10px] text-white/60">Sep 2026 Net Pay</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">₹1,18,400</span>
                  <span className="block text-[9px] text-white/50">TDS & PF Cleared</span>
                </div>
                <div className="rounded-lg bg-white/5 p-2.5 border border-white/10">
                  <span className="block text-[10px] text-white/60">Leave Balance</span>
                  <span className="font-mono text-sm font-bold text-sky-300">14 Earned</span>
                  <span className="block text-[9px] text-white/50">6 Sick • 2 Comp</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/80">
                <span>Vendor Invoices Pending</span>
                <span className="font-mono font-bold text-amber-400">PO-26-8812 (Cleared)</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-surface/90 px-3.5 py-2 shadow-sm text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <ShieldCheck size={14} className="text-sky-600" /> Enterprise IT Asset Security
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Compliant
              </span>
            </div>
          </div>
        ),
      };

    default: // smartcc
      return {
        slug: 'smartcc',
        badge: 'SmartCC • AI-First Support Platform',
        badgeIcon: <Sparkles size={14} className="text-sky-600" />,
        title: 'Customer Experience for India',
        subtitle:
          'Unified customer support operations with intelligent ticketing, multi-channel routing, and real-time voice interactions in Hindi and English.',
        accentColor: '#0082f5',
        gradientBg: 'from-[#0082f5] via-[#00a2f5] to-[#00d2ff]',
        features: [
          { text: 'Instant Bilingual Hindi & English Voice AI', sub: 'Groq Whisper STT + browser speech synthesis' },
          { text: 'Dynamic SLA Tracking & Automated Escalations', sub: 'Guaranteed response times and priority routing' },
          { text: 'Unified Multi-Tenant Company Management', sub: 'Centralized queues for all enterprise operations' },
        ],
        previewWidget: (
          <div className="mt-6 -rotate-[1.5deg] rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform hover:rotate-0">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold tracking-tight text-muted font-mono">SC-1042</span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                <Sparkles size={12} className="text-sky-600" /> AI Handling
              </span>
            </div>
            <p className="mt-3 font-semibold text-ink text-sm">Automated Voice & Text Resolution</p>
            <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-3 text-xs font-medium text-emerald-600">
              <SlaRing fraction={0.7} tone="ok" />
              <span className="font-mono font-bold">12m SLA Left</span>
              <span className="text-muted">· Instant First Response</span>
            </div>
          </div>
        ),
      };
  }
}
