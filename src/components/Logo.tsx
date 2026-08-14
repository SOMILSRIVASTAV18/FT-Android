import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function Logo({ className, iconClassName, size = 'md', showText = false }: LogoProps) {
  const logoId = useId().replace(/:/g, ""); // Remove colons to make it a valid CSS selector/ID
  const gradientId = `logoGradient-${logoId}`;
  const shadowId = `logoShadow-${logoId}`;

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-24 h-24 rounded-[32px]'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <div className={cn(
        "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 group relative overflow-hidden",
        sizeClasses[size]
      )}>
        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none" />
        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(iconSizes[size], iconClassName, "relative z-10")}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0.8" />
            </linearGradient>
            <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter={`url(#${shadowId})`}>
            <circle cx="42" cy="42" r="18" stroke={`url(#${gradientId})`} strokeWidth="9" fill="none"/>
            <path d="M42 34V50" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round"/>
            <circle cx="58" cy="58" r="18" stroke={`url(#${gradientId})`} strokeWidth="9" fill="none" strokeOpacity="0.8"/>
            <path d="M58 50V66" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" strokeOpacity="0.8"/>
          </g>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className={cn("font-black tracking-tighter text-foreground leading-none dark:text-white", textSizes[size])}>
            FinTrack <span className="text-primary italic">Pro</span>
          </h1>
          <span className={cn(
            "font-black uppercase tracking-[0.3em] text-primary/80",
            size === 'xl' ? 'text-xs' : 'text-[10px]'
          )}>
            Smart Finance
          </span>
        </div>
      )}
    </div>
  );
}
