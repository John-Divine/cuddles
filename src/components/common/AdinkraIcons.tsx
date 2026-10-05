import React from 'react';

interface AdinkraIconProps {
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  title?: string;
}

/**
 * Akoma - The Heart. Symbol of love, patience, faithfulness, endurance, and affection.
 */
export const AkomaIcon: React.FC<AdinkraIconProps> = ({
  className = 'w-6 h-6',
  size,
  color = 'currentColor',
  strokeWidth = 2,
  title = 'Akoma (The Heart of Patience & Love)'
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label={title}
  >
    <title>{title}</title>
    {/* Outer Heart with sacred inner loops */}
    <path
      d="M24 40.5C24 40.5 8 28.5 8 17.5C8 11.7 12.7 7 18.5 7C22.2 7 24 9.5 24 9.5C24 9.5 25.8 7 29.5 7C35.3 7 40 11.7 40 17.5C40 28.5 24 40.5 24 40.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Sacred central spiral of patience */}
    <path
      d="M24 16C21.5 16 19.5 18 19.5 20.5C19.5 23.5 24 27.5 24 27.5C24 27.5 28.5 23.5 28.5 20.5C28.5 18 26.5 16 24 16Z"
      fill={color}
      fillOpacity={0.25}
      stroke={color}
      strokeWidth={strokeWidth * 0.8}
    />
    <circle cx="24" cy="20.5" r="1.5" fill={color} />
  </svg>
);

/**
 * Odo Nnyew Fie Kwan - "Love never loses its way home".
 * Sacred Akan symbol of unconditional love, steadfast devotion, and deep bond.
 */
export const OdoNnyewFieKwanIcon: React.FC<AdinkraIconProps> = ({
  className = 'w-6 h-6',
  size,
  color = 'currentColor',
  strokeWidth = 2,
  title = 'Odo Nnyew Fie Kwan (Love Never Loses Its Way Home)'
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label={title}
  >
    <title>{title}</title>
    {/* Central intertwining pathway */}
    <path
      d="M12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24C36 30.6274 30.6274 36 24 36C17.3726 36 12 30.6274 12 24Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray="4 2"
    />
    {/* Left and right entwined heart hooks */}
    <path
      d="M16 24C16 19.5817 19.5817 16 24 16C28.4183 16 32 19.5817 32 24"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <path
      d="M32 24C32 28.4183 28.4183 32 24 32C19.5817 32 16 28.4183 16 24"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    {/* Crossing guiding arrows (homeward navigation) */}
    <circle cx="24" cy="24" r="3.5" fill={color} />
    <path d="M24 6V12M24 36V42M6 24H12M36 24H42" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
  </svg>
);

/**
 * Osram Ne Nsoromma - "The Moon and the Star".
 * Akan symbol of love, marital harmony, bonding, and fidelity in union.
 */
export const OsramNeNsorommaIcon: React.FC<AdinkraIconProps> = ({
  className = 'w-6 h-6',
  size,
  color = 'currentColor',
  strokeWidth = 2,
  title = 'Osram Ne Nsoromma (Love & Harmony in Union)'
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label={title}
  >
    <title>{title}</title>
    {/* Crescent Moon (Osram) embracing the star */}
    <path
      d="M32 10C24.268 10 18 16.268 18 24C18 31.732 24.268 38 32 38C34.4 38 36.6 37.4 38.6 36.3C33 38.8 26.2 36.3 23.4 30.6C20.6 24.9 23.1 18.1 28.8 15.3C30.6 14.4 32.5 14 34.5 14.1C33.7 12.8 32.6 11.7 32 10Z"
      fill={color}
      fillOpacity={0.2}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    {/* Guiding Star (Nsoromma) nested inside */}
    <path
      d="M16 20L18 24L22 24.5L19 27.5L20 31.5L16 29L12 31.5L13 27.5L10 24.5L14 24L16 20Z"
      fill={color}
      stroke={color}
      strokeWidth={strokeWidth * 0.75}
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Subtle African Geometric Gold Border Pattern
 */
export const AfricanGeometricDivider: React.FC<{ className?: string }> = ({ className = 'w-full h-3 my-2' }) => (
  <div className={`flex items-center justify-center gap-1.5 opacity-60 ${className}`} aria-hidden="true">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/40 to-amber-400" />
    <div className="flex items-center gap-1 text-amber-400 text-xs">
      <span className="w-1.5 h-1.5 rotate-45 border border-amber-400 bg-amber-500/20" />
      <span className="w-2 h-2 rotate-45 bg-amber-400" />
      <span className="w-1.5 h-1.5 rotate-45 border border-amber-400 bg-amber-500/20" />
    </div>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-500/40 to-amber-400" />
  </div>
);
