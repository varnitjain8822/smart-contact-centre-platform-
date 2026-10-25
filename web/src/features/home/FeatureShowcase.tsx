import { useTranslation } from 'react-i18next';
import {
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  Headphones,
  Languages,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import { company } from '../../lib/company';

interface FeatureItem {
  icon: typeof Mic;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}

export function FeatureShowcase() {
  const { t } = useTranslation();
  const c = company();

  const features: FeatureItem[] = [
    {
      icon: Mic,
      titleKey: 'home.features.f1Title',
      defaultTitle: 'Fast digital onboarding & voice AI',
      descKey: 'home.features.f1Desc',
      defaultDesc: 'Get started instantly with 100% automated AI assistance and continuous hands-free voice interactions in Hindi and English.',
    },
    {
      icon: Building2,
      titleKey: 'home.features.f2Title',
      defaultTitle: 'Multi-enterprise routing',
      descKey: 'home.features.f2Desc',
      defaultDesc: 'Switch seamlessly across State Bank of India, Tata Steel, Delhi Airport, Passport Seva, and Infosys with dedicated enterprise inboxes.',
    },
    {
      icon: Bot,
      titleKey: 'home.features.f3Title',
      defaultTitle: '100+ Automated workflows',
      descKey: 'home.features.f3Desc',
      defaultDesc: 'Check orders, supplier invoices, dispatch LR tracking, ATM block/PIN, and passport police verification without human delay.',
    },
    {
      icon: CheckCircle2,
      titleKey: 'home.features.f4Title',
      defaultTitle: 'High resolution success rates',
      descKey: 'home.features.f4Desc',
      defaultDesc: 'Achieve over 94% first-contact resolution with contextual article retrieval, live tool lookups, and precision routing.',
    },
    {
      icon: Clock,
      titleKey: 'home.features.f5Title',
      defaultTitle: 'Real-time visible SLA tracking',
      descKey: 'home.features.f5Desc',
      defaultDesc: 'Every ticket features a transparent response time clock, automated priority elevation, and proactive SLA breach defense.',
    },
    {
      icon: ShieldCheck,
      titleKey: 'home.features.f6Title',
      defaultTitle: 'Enterprise-grade security',
      descKey: 'home.features.f6Desc',
      defaultDesc: 'Secure interactions with zero-knowledge PII redaction for card & account numbers, OTP verification, and encrypted audit trails.',
    },
    {
      icon: Languages,
      titleKey: 'home.features.f7Title',
      defaultTitle: 'Dual-language voice intelligence',
      descKey: 'home.features.f7Desc',
      defaultDesc: 'Bilingual voice recognition and speech synthesis in native Hindi (Devanagari) and Indian English powered by Groq Whisper.',
    },
    {
      icon: Headphones,
      titleKey: 'home.features.f8Title',
      defaultTitle: 'Dedicated specialist assistance',
      descKey: 'home.features.f8Desc',
      defaultDesc: 'Complex inquiries seamlessly transition to certified human support specialists in Chatwoot with complete customer context.',
    },
  ];

  return (
    <section aria-labelledby="showcase-title" className="py-12 md:py-16 border-t border-line mt-12">
      <div className="mx-auto max-w-5xl text-center px-4">
        <h2
          id="showcase-title"
          className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-ink leading-[1.18]"
        >
          {t('home.features.mainHeading', {
            defaultValue: `Powerful reasons to choose ${c.name} Support Platform`,
            name: c.name,
          })}
        </h2>
        <p className="mt-4 text-base md:text-lg text-ink-2 max-w-2xl mx-auto">
          {t('home.features.subHeading', {
            defaultValue: 'An intelligent support ecosystem combining real-time AI voice agents, multi-company routing, and human specialists.',
          })}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="flex flex-col items-start group">
              <div className="size-16 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-5 transition-transform group-hover:scale-105 group-hover:shadow-md">
                <Icon aria-hidden size={28} strokeWidth={1.8} />
              </div>
              <h3 className="font-display font-bold text-lg text-ink mb-2 leading-snug">
                {t(f.titleKey, f.defaultTitle)}
              </h3>
              <p className="text-sm text-ink-2 leading-relaxed">
                {t(f.descKey, f.defaultDesc)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
