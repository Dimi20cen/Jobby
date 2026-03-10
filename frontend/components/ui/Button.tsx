'use client';

import Link from 'next/link';
import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = BaseProps & {
  href: string;
};

function classes(variant: ButtonVariant, className?: string): string {
  const variantClass =
    variant === 'secondary'
      ? 'button-link secondary-link'
      : variant === 'danger'
        ? 'button-link ghost-button danger-button'
        : 'button-link';

  return className ? `${variantClass} ${className}` : variantClass;
}

export function Button({ children, variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button {...props} className={classes(variant, className)}>
      {children}
    </button>
  );
}

export function LinkButton({ children, href, variant = 'primary', className }: LinkButtonProps) {
  return (
    <Link href={href} className={classes(variant, className)}>
      {children}
    </Link>
  );
}
