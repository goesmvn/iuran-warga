export const JepunIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="jepun-center-global" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#e11d48" /> 
        <stop offset="40%" stopColor="#facc15" /> 
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
      </radialGradient>
    </defs>
    <g transform="translate(50,50)">
      {[0, 72, 144, 216, 288].map(angle => (
        <path
          key={angle}
          transform={`rotate(${angle})`}
          d="M0,0 C-25,-15 -35,-42 0,-48 C20,-40 10,-15 0,0"
          fill="#ffffff"
          stroke="#fef08a"
          strokeWidth="1.5"
          className="drop-shadow-sm"
        />
      ))}
    </g>
    <circle cx="50" cy="50" r="22" fill="url(#jepun-center-global)" />
  </svg>
);
