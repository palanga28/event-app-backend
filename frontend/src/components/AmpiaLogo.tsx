import React, { useState, useEffect } from 'react';

interface AmpiaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const AmpiaLogo: React.FC<AmpiaLogoProps> = ({ className = '', size = 'md', showText = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    // Animation d'apparition au montage
    setIsVisible(true);
    
    // Le texte apparaît après le logo
    const textTimer = setTimeout(() => {
      setTextVisible(true);
    }, 800);

    return () => clearTimeout(textTimer);
  }, []);

  const sizeClasses = {
    sm: { container: 'w-8 h-8', text: 'text-xs' },
    md: { container: 'w-12 h-12', text: 'text-sm' },
    lg: { container: 'w-16 h-16', text: 'text-base' }
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Logo animé */}
      <div 
        className={`${sizeClasses[size].container} transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <svg
          viewBox="0 0 80 80"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Design minimaliste AMPIA */}
          <g>
            {/* Triangle principal (A) */}
            <path
              d="M20 60 L30 25 L40 60 Z"
              fill="url(#redGradient)"
              filter="url(#glow)"
            />
            
            {/* Barre du A */}
            <rect
              x="24"
              y="45"
              width="12"
              height="3"
              fill="#000000"
            />
            
            {/* Forme M géométrique */}
            <path
              d="M38 60 L38 25 L44 42 L50 25 L50 60"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Cercle P minimaliste */}
            <circle
              cx="60"
              cy="40"
              r="8"
              stroke="url(#redGradient)"
              strokeWidth="3"
              fill="none"
              filter="url(#glow)"
            />
            
            {/* Ligne P */}
            <line
              x1="60"
              y1="25"
              x2="60"
              y2="60"
              stroke="url(#redGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
            />
            
            {/* Points décoratifs */}
            <circle cx="30" cy="70" r="1.5" fill="url(#redGradient)" />
            <circle cx="40" cy="70" r="1.5" fill="#ffffff" />
            <circle cx="50" cy="70" r="1.5" fill="url(#redGradient)" />
          </g>
          
          {/* Dégradés modernes */}
          <defs>
            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            
            {/* Glow doux */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* Texte AMPIA animé */}
      {showText && (
        <div 
          className={`mt-2 font-bold tracking-wider transition-all duration-500 ease-out ${
            textVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-2'
          }`}
        >
          <span className={`${sizeClasses[size].text} bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent`}>
            AMPIA
          </span>
        </div>
      )}
    </div>
  );
};

export default AmpiaLogo;
