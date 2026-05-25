import React from 'react';

export default function Logo({ size = 32, style = {} }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      width={size} 
      height={size} 
      style={{ display: 'inline-block', flexShrink: 0, ...style }}
    >
      {/* Receipt Document background & border */}
      <path d="M150 80 
               H400 
               V430 
               L375 410 L350 430 L325 410 L300 430 L275 410 L250 430 L225 410 L200 430 L175 410 L150 430 
               Z" 
            fill="#F4F7F9" 
            stroke="#59A5E8" 
            strokeWidth="12" 
            strokeLinejoin="round" />

      {/* Horizontal lines representing items */}
      <line x1="190" y1="140" x2="300" y2="140" stroke="#59A5E8" strokeWidth="12" strokeLinecap="round" />
      <line x1="190" y1="185" x2="360" y2="185" stroke="#59A5E8" strokeWidth="12" strokeLinecap="round" />
      <line x1="190" y1="230" x2="270" y2="230" stroke="#59A5E8" strokeWidth="12" strokeLinecap="round" />

      {/* Blue Checkmark (Tick) */}
      <path d="M196 320 L260 384 L410 200" 
            fill="none" 
            stroke="#59A5E8" 
            strokeWidth="24" 
            strokeLinecap="round" 
            strokeLinejoin="round" />

      {/* Starburst Badge */}
      <polygon points="230,260 211.8,280.1 214.7,307 188.2,312.6 176.4,336.9 148.5,329.8 129.4,347 105.7,328.7 82.2,337.3 69.1,313.9 45.4,309.4 46.5,281.4 27.6,268.4 41.5,244 32.2,217.6 56.4,205.1 60.5,177.3 87.1,176.7 102.7,153.8 128.2,165.7 150,148 168,169.5 194.2,165.7 202.4,192.4 225.8,200.6 222.9,228.6" 
               fill="#59A5E8" 
               stroke="#59A5E8" 
               strokeWidth="4" 
               strokeLinejoin="round" />

      {/* "FREE" Text in Badge */}
      <text x="136" y="271" 
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
            fontWeight="900" 
            fontSize="32" 
            fill="#FFFFFF" 
            textAnchor="middle">FREE</text>
    </svg>
  );
}
