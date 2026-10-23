import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { fieldClass } from './Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={`${fieldClass} min-h-12 appearance-none pr-10 ${className}`} {...rest}>{children}</select>
      <ChevronDown aria-hidden size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
});
