import React from 'react';

interface BrandLogoProps {
  brandId: string;
  color: string;
  size?: number;
  className?: string;
}

export function BrandLogo({ brandId, color, size = 80, className = '' }: BrandLogoProps) {
  const logos: Record<string, React.ReactNode> = {
    alfa: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}80`} />
          </linearGradient>
        </defs>
        {/* Letter A with geometric style */}
        <polygon points="50,10 90,90 10,90" fill="none" stroke={`url(#grad-${brandId})`} strokeWidth="4" />
        <polygon points="50,30 70,75 30,75" fill={`url(#grad-${brandId})`} opacity="0.3" />
        <line x1="35" y1="65" x2="65" y2="65" stroke={color} strokeWidth="4" />
        {/* Mesh pattern */}
        <circle cx="50" cy="50" r="15" fill="none" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
      </svg>
    ),
    
    marbo: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#FF6B6B" />
          </linearGradient>
        </defs>
        {/* Letter M with bars */}
        <rect x="15" y="20" width="12" height="60" rx="4" fill={`url(#grad-${brandId})`} />
        <rect x="73" y="20" width="12" height="60" rx="4" fill={`url(#grad-${brandId})`} />
        <polygon points="27,20 50,45 73,20" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <rect x="44" y="35" width="12" height="45" rx="4" fill={color} opacity="0.5" />
        {/* Energy lines */}
        <line x1="20" y1="75" x2="35" y2="75" stroke={color} strokeWidth="3" />
        <line x1="65" y1="75" x2="80" y2="75" stroke={color} strokeWidth="3" />
      </svg>
    ),
    
    mood: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#FF69B4" />
          </linearGradient>
        </defs>
        {/* Circle with M inside - mood ring style */}
        <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#grad-${brandId})`} strokeWidth="4" />
        <circle cx="50" cy="50" r="30" fill={color} opacity="0.2" />
        {/* M shape */}
        <path d="M30 70 L30 35 L45 55 L50 45 L55 55 L70 35 L70 70" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Sparkles */}
        <circle cx="25" cy="25" r="3" fill={color} />
        <circle cx="75" cy="25" r="3" fill={color} />
        <circle cx="80" cy="60" r="2" fill={color} />
      </svg>
    ),
    
    vplus: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>
        {/* V shape */}
        <polygon points="50,15 75,85 50,60 25,85" fill={`url(#grad-${brandId})`} />
        {/* Plus sign */}
        <rect x="60" y="20" width="8" height="35" rx="2" fill={color} />
        <rect x="50" y="30" width="28" height="8" rx="2" fill={color} />
        {/* Energy boost lines */}
        <line x1="20" y1="25" x2="30" y2="25" stroke={color} strokeWidth="3" />
        <line x1="25" y1="20" x2="25" y2="30" stroke={color} strokeWidth="3" />
      </svg>
    ),
    
    eskobar: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
        </defs>
        {/* E with switch symbol */}
        <rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke={`url(#grad-${brandId})`} strokeWidth="4" />
        {/* E bars */}
        <line x1="30" y1="35" x2="70" y2="35" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <line x1="30" y1="50" x2="55" y2="50" stroke={color} strokeWidth="6" strokeLinecap="round" />
        <line x1="30" y1="65" x2="70" y2="65" stroke={color} strokeWidth="6" strokeLinecap="round" />
        {/* Switch circle */}
        <circle cx="65" cy="50" r="8" fill={color} />
        <circle cx="62" cy="50" r="3" fill="#000" />
      </svg>
    ),
    
    mbar: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* Bar/rectangle with M */}
        <rect x="15" y="25" width="70" height="50" rx="10" fill={`url(#grad-${brandId})`} opacity="0.3" />
        <rect x="15" y="25" width="70" height="50" rx="10" fill="none" stroke={color} strokeWidth="3" />
        {/* M inside */}
        <path d="M30 65 L30 40 L42 55 L50 40 L58 55 L70 40 L70 65" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {/* Mode dots */}
        <circle cx="25" cy="75" r="4" fill={color} />
        <circle cx="50" cy="75" r="4" fill={color} />
        <circle cx="75" cy="75" r="4" fill={color} />
      </svg>
    ),
    
    relx: (
      <svg viewBox="0 0 100 100" className={className}>
        <defs>
          <linearGradient id={`grad-${brandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        {/* R with leaf/relax symbol */}
        <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#grad-${brandId})`} strokeWidth="4" />
        {/* R shape */}
        <path d="M35 75 L35 25 L55 25 Q70 25 70 40 Q70 55 55 55 L35 55" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        <line x1="50" y1="55" x2="70" y2="75" stroke={color} strokeWidth="5" strokeLinecap="round" />
        {/* Relax wave */}
        <path d="M25 70 Q35 65 45 70" fill="none" stroke={color} strokeWidth="2" opacity="0.6" />
      </svg>
    ),
  };

  const defaultLogo = (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="40" fill={color} opacity="0.2" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="3" />
      <text x="50" y="60" textAnchor="middle" fill={color} fontSize="40" fontWeight="bold">
        {brandId.charAt(0).toUpperCase()}
      </text>
    </svg>
  );

  return (
    <div style={{ width: size, height: size }}>
      {logos[brandId] || defaultLogo}
    </div>
  );
}