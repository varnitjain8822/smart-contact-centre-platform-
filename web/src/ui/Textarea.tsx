import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { fieldClass } from './Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...rest }, ref) {
  return <textarea ref={ref} className={`${fieldClass} min-h-32 py-3 leading-relaxed ${className}`} {...rest} />;
});
