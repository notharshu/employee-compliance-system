import React from 'react';

const Logo = ({ size = 'md', showText = true, textColor = 'text-gray-900' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Shield Logo Icon */}
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          {/* Shield Background */}
          <path
            d="M50 5 L20 20 L20 45 Q20 75 50 95 Q80 75 80 45 L80 20 Z"
            fill="url(#shieldGradient)"
            className="drop-shadow-lg"
          />
          {/* Checkmark */}
          <path
            d="M35 50 L45 60 L65 35"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Inner highlight */}
          <path
            d="M50 10 L25 22 L25 43 Q25 65 50 82 Q75 65 75 43 L75 22 Z"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex items-center">
          <span className={`font-manrope font-bold ${textSizeClasses[size]} ${textColor} leading-tight`}>
            Employee Compliance
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
