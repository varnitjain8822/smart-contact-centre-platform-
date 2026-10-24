import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Grid, Home } from 'lucide-react';
import { api } from '../../lib/api';
import { basenameFor, company, DEFAULT_COMPANY, type Company } from '../../lib/company';
import { DropdownMenu, type MenuItem } from '../../ui/DropdownMenu';

export function CompanySwitcher() {
  const current = company();
  const q = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.companies().then((r) => r.items),
    staleTime: 60_000,
  });

  const companies: Company[] = q.data ?? [
    DEFAULT_COMPANY,
    { slug: 'sbi', name: 'State Bank of India', sector: 'Bank', tagline: '', primaryColor: '#22409A', accentColor: '#00B5EF', logoText: 'SBI', supportHours: '', demo: false, categories: [] },
    { slug: 'tatasteel', name: 'Tata Steel', sector: 'Manufacturing', tagline: '', primaryColor: '#005A9C', accentColor: '#E31B23', logoText: 'Tata Steel', supportHours: '', demo: false, categories: [] },
    { slug: 'delhiairport', name: 'Delhi Airport', sector: 'Aviation', tagline: '', primaryColor: '#002B49', accentColor: '#D97706', logoText: 'DEL', supportHours: '', demo: false, categories: [] },
    { slug: 'passportseva', name: 'Passport Seva', sector: 'Government', tagline: '', primaryColor: '#1E3A8A', accentColor: '#F59E0B', logoText: 'Passport', supportHours: '', demo: false, categories: [] },
    { slug: 'infosys', name: 'Infosys', sector: 'IT Services', tagline: '', primaryColor: '#007CC3', accentColor: '#10B981', logoText: 'Infosys', supportHours: '', demo: false, categories: [] },
  ];

  const items: MenuItem[] = [
    {
      label: 'Portal Home',
      icon: Home,
      onSelect: () => {
        window.location.href = basenameFor(current.slug);
      },
    },
    'separator',
    ...companies.map((c) => ({
      label: (
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-3.5 shrink-0 rounded-full"
            style={{ background: `linear-gradient(135deg, ${c.primaryColor}, ${c.accentColor})` }}
          />
          <span className="truncate font-medium">{c.name}</span>
        </span>
      ),
      checked: current.slug === c.slug,
      onSelect: () => {
        if (current.slug !== c.slug) {
          window.location.href = basenameFor(c.slug);
        }
      },
    })),
    'separator',
    {
      label: 'All Portals (Directory)',
      icon: Grid,
      onSelect: () => {
        window.location.href = '/';
      },
    },
  ];

  return (
    <DropdownMenu
      label="Switch company"
      align="start"
      header={<p className="text-xs font-semibold uppercase tracking-wider text-muted">Select Company</p>}
      items={items}
      trigger={(p) => (
        <button
          type="button"
          {...p}
          className="group inline-flex items-center gap-2 rounded-pill py-1 text-left font-display text-xl font-bold tracking-tight text-ink transition-colors hover:text-accent"
          title="Click to switch company"
        >
          <svg aria-hidden width="26" height="26" viewBox="0 0 20 20" className="shrink-0 text-accent">
            <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="3" />
            <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="33 60" transform="rotate(-90 10 10)" />
          </svg>
          <span className="truncate">{current.logoText || current.name}</span>
          <ChevronDown
            aria-hidden
            size={16}
            className="shrink-0 text-ink-2 transition-transform duration-150 group-aria-expanded:rotate-180"
          />
        </button>
      )}
    />
  );
}
