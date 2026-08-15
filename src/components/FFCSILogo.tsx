import React from 'react';

interface FFCSILogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  textColor?: 'dark' | 'light';
  variant?: 'icon' | 'horizontal' | 'stacked';
}

/**
 * FFCSI Official Brand Logo Component (Family Friends Consultancy Services Inc.)
 * Preserves exact aspect ratio and visual fidelity without distortion.
 */
export const FFCSILogo: React.FC<FFCSILogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  textColor = 'dark',
  variant = 'icon',
}) => {
  // Resolve pixel size for the icon badge
  let badgeSize = 36;
  if (typeof size === 'number') {
    badgeSize = size;
  } else {
    switch (size) {
      case 'sm':
        badgeSize = 28;
        break;
      case 'md':
        badgeSize = 38;
        break;
      case 'lg':
        badgeSize = 52;
        break;
      case 'xl':
        badgeSize = 80;
        break;
    }
  }

  // Vector Badge representation of the FFCSI Red & Silver Medallion
  const emblemSvg = (
    <svg
      width={badgeSize}
      height={badgeSize}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-sm select-none"
      style={{ aspectRatio: '1 / 1' }}
    >
      <defs>
        {/* Outer Silver Bevel Gradient */}
        <linearGradient id="silverRing" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#D8DDE3" />
          <stop offset="50%" stopColor="#8E99A4" />
          <stop offset="75%" stopColor="#E2E7ED" />
          <stop offset="100%" stopColor="#6C7682" />
        </linearGradient>

        {/* Inner Silver Rim */}
        <linearGradient id="innerSilverRim" x1="200" y1="0" x2="0" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A0AAB4" />
          <stop offset="40%" stopColor="#F0F3F6" />
          <stop offset="70%" stopColor="#7B8590" />
          <stop offset="100%" stopColor="#E9EDF2" />
        </linearGradient>

        {/* Crimson Red Radial Background */}
        <radialGradient id="crimsonBg" cx="35%" cy="32%" r="68%" fx="35%" fy="32%">
          <stop offset="0%" stopColor="#FF1E27" />
          <stop offset="45%" stopColor="#D9040F" />
          <stop offset="80%" stopColor="#9E0008" />
          <stop offset="100%" stopColor="#5E0004" />
        </radialGradient>

        {/* 3D Metallic Silver Letters Gradient */}
        <linearGradient id="metalLetter" x1="50" y1="30" x2="150" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="20%" stopColor="#F1F4F8" />
          <stop offset="45%" stopColor="#CBD3DC" />
          <stop offset="65%" stopColor="#95A2B0" />
          <stop offset="85%" stopColor="#DEE4EB" />
          <stop offset="100%" stopColor="#7E8A98" />
        </linearGradient>

        {/* Dark drop shadow filter for 3D depth */}
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
        </filter>
        <filter id="monogramShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#3D0003" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Outer Metallic Ring */}
      <circle cx="100" cy="100" r="96" fill="url(#silverRing)" filter="url(#badgeShadow)" />
      <circle cx="100" cy="100" r="91" fill="url(#innerSilverRim)" />

      {/* Inner Crimson Core */}
      <circle cx="100" cy="100" r="86" fill="url(#crimsonBg)" />

      {/* Subtle Inner Highlight Ring */}
      <circle cx="100" cy="100" r="85" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />

      {/* Stylized Interlocking FFCSI Monogram Vector */}
      <g filter="url(#monogramShadow)" fill="url(#metalLetter)" stroke="#6A7684" strokeWidth="0.8">
        {/* Left 'F' vertical pillar */}
        <path d="M 52 48 L 74 48 L 74 135 L 63 135 L 63 102 L 52 102 Z" />
        
        {/* Top 'F' Horizontal Upper Crossbar */}
        <path d="M 52 48 L 132 48 L 132 60 L 74 60 L 74 48 Z" />
        
        {/* Middle 'F' Crossbar */}
        <path d="M 52 75 L 118 75 L 118 87 L 74 87 L 74 75 Z" />

        {/* Stylized Outer 'C' Arch */}
        <path d="M 125 58 C 88 58 68 80 68 106 C 68 132 88 152 125 152 C 142 152 153 145 156 138 L 144 130 C 140 134 134 139 124 139 C 98 139 84 124 84 106 C 84 87 98 71 124 71 C 135 71 142 76 146 81 L 157 73 C 151 64 140 58 125 58 Z" />

        {/* Stylized Lower Interlocking 'S' Curves */}
        <path d="M 148 94 C 144 87 136 84 126 84 C 111 84 103 91 103 100 C 103 113 120 116 135 120 C 151 124 162 131 162 144 C 162 158 148 168 128 168 C 110 168 98 160 93 151 L 104 142 C 108 149 116 155 128 155 C 138 155 147 150 147 142 C 147 132 131 128 116 124 C 102 120 89 113 89 99 C 89 86 103 74 125 74 C 138 74 149 80 156 88 Z" />

        {/* Right 'I' Pillar Accent */}
        <path d="M 144 48 L 156 48 L 156 112 L 144 112 Z" />
      </g>
    </svg>
  );

  if (variant === 'icon' && !showText) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{emblemSvg}</div>;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        {emblemSvg}
        <div className="mt-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="w-4 h-[1.5px] bg-rose-600 rounded-full" />
            <span className={`text-lg font-black tracking-widest font-serif ${textColor === 'light' ? 'text-white' : 'text-slate-900'}`}>
              FFCSI
            </span>
            <span className="w-4 h-[1.5px] bg-rose-600 rounded-full" />
          </div>
          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${textColor === 'light' ? 'text-slate-300' : 'text-slate-600'}`}>
            Family Friends Consultancy Services Inc.
          </p>
          <div className="w-12 h-[1px] bg-rose-600/60 mx-auto mt-1 rounded-full" />
        </div>
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {emblemSvg}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-extrabold tracking-wider font-serif ${textColor === 'light' ? 'text-white' : 'text-slate-900'}`}>
            FFCSI
          </span>
        </div>
        <p className={`text-[10px] font-semibold tracking-tight truncate ${textColor === 'light' ? 'text-slate-300' : 'text-slate-600'}`}>
          Family Friends Consultancy Services Inc.
        </p>
      </div>
    </div>
  );
};
