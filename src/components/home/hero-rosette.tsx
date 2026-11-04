/** Decorative eight-point rosette (gold line art) for the homepage hero when there are no photos yet. */
export function HeroRosette({ className = "" }: { className?: string }) {
  const rays = Array.from({ length: 32 }, (_, i) => i * (360 / 32));
  return (
    <svg viewBox="0 0 400 400" fill="none" stroke="currentColor" aria-hidden="true" focusable="false" className={className}>
      <circle cx="200" cy="200" r="196" strokeOpacity="0.45" />
      <circle cx="200" cy="200" r="184" strokeOpacity="0.25" strokeDasharray="2 6" />
      <g strokeOpacity="0.35">
        {rays.map((deg) => (
          <line key={deg} x1="200" y1="22" x2="200" y2="38" transform={`rotate(${deg} 200 200)`} />
        ))}
      </g>
      <g strokeWidth="1.25" strokeOpacity="0.8">
        <rect x="76" y="76" width="248" height="248" />
        <rect x="76" y="76" width="248" height="248" transform="rotate(45 200 200)" />
      </g>
      <circle cx="200" cy="200" r="124" strokeOpacity="0.5" />
      <g strokeOpacity="0.55">
        <rect x="122" y="122" width="156" height="156" />
        <rect x="122" y="122" width="156" height="156" transform="rotate(45 200 200)" />
      </g>
      <path d="M200.0 138.0L211.5 172.3L243.8 156.2L227.7 188.5L262.0 200.0L227.7 211.5L243.8 243.8L211.5 227.7L200.0 262.0L188.5 227.7L156.2 243.8L172.3 211.5L138.0 200.0L172.3 188.5L156.2 156.2L188.5 172.3z" strokeOpacity="0.9" strokeWidth="1.25" />
      <circle cx="200" cy="200" r="18" strokeOpacity="0.7" />
    </svg>
  );
}
