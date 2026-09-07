import React from 'react';

/**
 * The circular shield mark from logo.jpeg, cropped via CSS so only the
 * emblem shows (the source image also contains the wordmark below).
 * Crop values measured from the source: circle bbox (166,110)-(862,756),
 * so a 648px window at (190,109) frames the emblem exactly.
 */
export function LogoMark({ className = 'h-10 w-10', alt = 'SafeStep logo' }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full shadow-md shadow-sky-200 ${className}`}>
      <img
        src="/logo.jpeg"
        alt={alt}
        className="absolute"
        style={{ width: '158%', maxWidth: 'none', left: '-29.3%', top: '-16.8%' }}
        draggable={false}
      />
    </span>
  );
}

/** Full logo including the "SafeStep – AI Child Guardian" wordmark. */
export function LogoFull({ className = 'h-32 w-auto', alt = 'SafeStep – AI Child Guardian' }) {
  return <img src="/logo.jpeg" alt={alt} className={className} draggable={false} />;
}
