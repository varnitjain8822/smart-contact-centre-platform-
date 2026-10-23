import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

export type Variant = 'primary' | 'secondary' | 'ghost' | 'ai';
const V: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent/90 shadow-card',
  secondary: 'bg-surface text-ink border border-line-strong/60 hover:border-line-strong hover:bg-surface-2/60',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  ai: 'bg-ai text-on-accent hover:bg-ai/90',
};

/** Shared so router <Link>s can look like buttons. */
export const buttonClass = (variant: Variant = 'primary', extra = '') =>
  `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill px-5 text-[15px] font-semibold
   transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${V[variant]} ${extra}`;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; pending?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', pending, disabled, className = '', children, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || pending} aria-busy={pending || undefined}
      className={buttonClass(variant, className)} {...rest}>
      {pending && <LoaderCircle aria-hidden size={18} className="animate-spin" />}
      {children}
    </button>
  );
});
