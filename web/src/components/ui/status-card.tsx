'use client';

import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  body: string;
  color: 'primary' | 'secondary' | 'accent';
  className?: string;
}

export default function StatusCard({ title, body, color, className }: StatusCardProps) {
  return (
    <div className={cn(
      'rounded-xl p-4 shadow-sm transition-all duration-200 hover:shadow-md',
      color === 'primary' && 'bg-primary/10 text-primary',
      color === 'secondary' && 'bg-secondary/10 text-secondary', 
      color === 'accent' && 'bg-accent/10 text-accent',
      className
    )}>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="mt-1 text-xs opacity-80">{body}</p>
    </div>
  );
} 