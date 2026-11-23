import type { ButtonHTMLAttributes } from 'react';

export type UIButtonVariant = 'primary' | 'ghost' | 'accent' | 'icon' | 'pill-toggle';

interface UIButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UIButtonVariant;
  name: string;
}

/** Shared accessible button primitive for the portfolio HUD and controls. */
export function UIButton({ variant = 'primary', name, className = '', ...props }: UIButtonProps) {
  return <button {...props} data-ui={name} className={`ui-button ui-button--${variant} ${className}`.trim()} />;
}
