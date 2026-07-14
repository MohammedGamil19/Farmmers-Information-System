// Simplified GAPOKTAN Sukorejo seal — no micro-text, so it stays legible from
// 16px (favicon) up to large UI. Shares the full seal's identity: green ring
// with yellow borders, cream center, sun + sprout.
export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Logo GAPOKTAN Sukorejo" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#12813E" />
      <circle cx="50" cy="50" r="46.5" fill="none" stroke="#F5C518" stroke-width="3" />
      <circle cx="50" cy="50" r="33" fill="#F6F8F1" />
      <circle cx="50" cy="50" r="34.5" fill="none" stroke="#F5C518" stroke-width="2" />
      <circle cx="50" cy="34" r="5.5" fill="#F5C518" />
      <g stroke="#F5C518" strokeWidth="3" strokeLinecap="round">
        <line x1="50" y1="23" x2="50" y2="19" />
        <line x1="41" y1="26" x2="38" y2="22" />
        <line x1="59" y1="26" x2="62" y2="22" />
      </g>
      <path d="M50 76 C 50 65 50 55 50 45" fill="none" stroke="#137A3C" strokeWidth="6" strokeLinecap="round" />
      <path d="M50 62 C 36 60 29 49 31 39 C 44 42 49 52 50 62 Z" fill="#22A24C" />
      <path d="M50 62 C 64 60 71 49 69 39 C 56 42 51 52 50 62 Z" fill="#2CB956" />
    </svg>
  )
}
