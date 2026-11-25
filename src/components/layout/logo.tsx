import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showSubtext?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TeamTrailLogo({ className, showSubtext = false, size = 'md' }: LogoProps) {
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={iconSizes[size]}
        aria-hidden="true"
      >
        <rect width="36" height="36" rx="8" fill="#4F46E5" />
        {/* Branching & connected trail nodes */}
        <path
          d="M11 26V10M11 18C11 18 15 18 18 14C20.5 10.67 25 11 25 11"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M11 21C11 21 17 21 20 24C21.8 25.8 25 25 25 25"
          stroke="#5EEAD4"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="11" cy="10" r="2.5" fill="#FFFFFF" />
        <circle cx="11" cy="26" r="2.5" fill="#FFFFFF" />
        <circle cx="25" cy="11" r="2.5" fill="#FFFFFF" />
        <circle cx="25" cy="25" r="2.5" fill="#5EEAD4" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={cn('font-semibold tracking-tight text-slate-900', textSizes[size])}>
          TeamTrail
        </span>
        {showSubtext && (
          <span className="mt-0.5 text-[11px] font-medium text-slate-500">
            by Yash Bhanu
          </span>
        )}
      </div>
    </div>
  );
}
