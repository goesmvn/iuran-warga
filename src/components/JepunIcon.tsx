export const JepunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      {/* Center of the flower: Deep orange merging into yellow */}
      <radialGradient id="jepun-center-global" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ea580c" /> 
        <stop offset="60%" stopColor="#eab308" /> 
        <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
      </radialGradient>
      
      {/* Individual Petal Gradient: Yellow center base fading outwards to clean white */}
      <linearGradient id="jepun-petal-grad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#fef08a" />
        <stop offset="85%" stopColor="#ffffff" />
      </linearGradient>
    </defs>
    
    {/* Shadow background element for soft print contrast */}
    <circle cx="50" cy="50" r="48" fill="#fafaf9" stroke="#f5f5f4" strokeWidth="1" />
    
    <g transform="translate(50,50)">
      {[0, 72, 144, 216, 288].map(angle => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          // Standard Balinese plumeria petal curve
          d="M0,0 C-25,-12 -38,-38 0,-48 C22,-44 14,-15 0,0"
          fill="url(#jepun-petal-grad)"
          // Use deep bronze/gold outline for distinct visibility on white paper
          stroke="#b45309"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      ))}
    </g>
    
    {/* Deep glowing center of the plumeria */}
    <circle cx="50" cy="50" r="16" fill="url(#jepun-center-global)" />
    
    {/* Additional tiny golden core lines to give depth to the plumeria */}
    <circle cx="50" cy="50" r="5" fill="#fef08a" opacity="0.9" />
  </svg>
);
