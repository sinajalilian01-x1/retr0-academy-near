import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-accent-text" aria-label="Retr0 Academy home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot/retr0-head-64.webp" alt="" width={32} height={32} className="h-8 w-8 shrink-0" decoding="async" />
      <span className="font-pixel text-[0.62rem] leading-relaxed sm:text-xs">Retr0 Academy</span>
    </Link>
  );
}
