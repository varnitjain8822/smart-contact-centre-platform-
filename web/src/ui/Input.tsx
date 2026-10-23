import { forwardRef, type InputHTMLAttributes } from 'react';

export const fieldClass = `w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base text-ink
  placeholder:text-muted transition-colors hover:border-ink-2 focus-visible:border-accent
  aria-[invalid=true]:border-bad disabled:opacity-60`;

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest }, ref) {
  return <input ref={ref} className={`${fieldClass} min-h-12 ${className}`} {...rest} />;
});
