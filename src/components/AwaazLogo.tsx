import React from 'react';

interface AwaazLogoProps {
  className?: string;
  size?: number; // width in pixels
  withBackground?: boolean;
}

export const AwaazLogo: React.FC<AwaazLogoProps> = ({
  className = '',
  size = 50,
  withBackground = false,
}) => {
  // Height is calculated based on the aspect ratio 100:132
  const height = size * 1.32;

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: withBackground ? size : height }}
    >
      <svg
        viewBox="0 0 100 132"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {withBackground && (
          <rect
            x="2"
            y="2"
            width="96"
            height="128"
            rx="24"
            fill="white"
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        )}
        
        {/* Main Stylized "A" Arch in Deep Green */}
        <path
          d="M 20 78 C 20 45, 28 18, 50 18 C 72 18, 80 45, 80 78 C 80 79.5, 78.5 81, 76.5 81 L 67.5 81 C 65.5 81, 64 79.5, 64 77.5 C 64 57, 59 46, 50 46 C 41 46, 36 57, 36 77.5 C 36 79.5, 34.5 81, 32.5 81 L 23.5 81 C 21.5 81, 20 79.5, 20 78 Z"
          fill="#0d5c46"
        />

        {/* White Speech Bubble */}
        <circle cx="50" cy="40" r="14" fill="white" />
        <path d="M 40 47 L 34 54 L 46 48 Z" fill="white" />

        {/* Sound Wave inside speech bubble (Orange) */}
        <rect x="41" y="36" width="2.2" height="8" rx="1.1" fill="#f18024" />
        <rect x="45" y="32" width="2.2" height="16" rx="1.1" fill="#f18024" />
        <rect x="49" y="29" width="2.2" height="22" rx="1.1" fill="#f18024" />
        <rect x="53" y="32" width="2.2" height="16" rx="1.1" fill="#f18024" />
        <rect x="57" y="36" width="2.2" height="8" rx="1.1" fill="#f18024" />

        {/* Center Person (Orange) */}
        <circle cx="50" cy="59" r="4.5" fill="#f18024" />
        <path
          d="M 37 70 C 42 63, 44 63, 50 67 C 56 63, 58 63, 63 70 C 58 74, 42 74, 37 70 Z"
          fill="#f18024"
        />

        {/* Left Person (Green) */}
        <circle cx="36" cy="62" r="3" fill="#0d5c46" />
        <path
          d="M 30 72 C 32 67, 34 66, 39 69 C 36 73, 32 74, 30 72 Z"
          fill="#0d5c46"
        />

        {/* Right Person (Green) */}
        <circle cx="64" cy="62" r="3" fill="#0d5c46" />
        <path
          d="M 70 72 C 68 67, 66 66, 61 69 C 64 73, 68 74, 70 72 Z"
          fill="#0d5c46"
        />

        {/* Awaaz text in deep green */}
        <text 
          x="50" 
          y="98" 
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
          fontWeight="bold" 
          fontSize="18" 
          fill="#0d5c46" 
          textAnchor="middle"
          letterSpacing="-0.2"
        >
          Awaaz
        </text>

        {/* Divider lines + Ashoka Chakra */}
        {/* Left Orange Line */}
        <line x1="12" y1="108" x2="43" y2="108" stroke="#f18024" strokeWidth="1.2" strokeLinecap="round" />
        
        {/* Right Green Line */}
        <line x1="57" y1="108" x2="88" y2="108" stroke="#0d5c46" strokeWidth="1.2" strokeLinecap="round" />

        {/* Ashoka Chakra */}
        <g transform="translate(50, 108)">
          <circle cx="0" cy="0" r="4.5" stroke="#0c2340" strokeWidth="0.8" fill="none" />
          <circle cx="0" cy="0" r="1" fill="#0c2340" />
          
          {/* Spoke lines */}
          <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke="#0c2340" strokeWidth="0.25" />
          <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#0c2340" strokeWidth="0.25" />
          <line x1="-3.18" y1="-3.18" x2="3.18" y2="3.18" stroke="#0c2340" strokeWidth="0.25" />
          <line x1="-3.18" y1="3.18" x2="3.18" y2="-3.18" stroke="#0c2340" strokeWidth="0.25" />
          
          <line x1="-1.16" y1="-4.35" x2="1.16" y2="4.35" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="1.16" y1="-4.35" x2="-1.16" y2="4.35" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="-4.35" y1="-1.16" x2="4.35" y2="1.16" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="-4.35" y1="1.16" x2="4.35" y2="-1.16" stroke="#0c2340" strokeWidth="0.2" />

          <line x1="-2.25" y1="-3.9" x2="2.25" y2="3.9" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="2.25" y1="-3.9" x2="-2.25" y2="3.9" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="-3.9" y1="-2.25" x2="3.9" y2="2.25" stroke="#0c2340" strokeWidth="0.2" />
          <line x1="-3.9" y1="2.25" x2="3.9" y2="-2.25" stroke="#0c2340" strokeWidth="0.2" />
        </g>

        {/* आवाज़ text in deep green */}
        <text 
          x="50" 
          y="125" 
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
          fontWeight="bold" 
          fontSize="15" 
          fill="#0d5c46" 
          textAnchor="middle"
        >
          आवाज़
        </text>
      </svg>
    </div>
  );
};
