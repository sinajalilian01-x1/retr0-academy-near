/** Retr0 Academy mascot: the low-poly CRT robot head. */
export function TutorIcon({ className, size = 64 }: { className?: string; size?: 64 | 128 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/mascot/retr0-head-${size}.webp`} alt="" width={size} height={size} className={className} decoding="async" aria-hidden />;
}
