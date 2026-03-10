import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type Props<T extends ElementType> = {
  children: ReactNode;
  className?: string;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export default function Card<T extends ElementType = 'section'>({
  children,
  className,
  as,
  ...props
}: Props<T>) {
  const Tag = (as || 'section') as ElementType;
  return (
    <Tag {...props} className={className ? `panel ${className}` : 'panel'}>
      {children}
    </Tag>
  );
}
