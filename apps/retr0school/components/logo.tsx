import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 text-accent-text">
      <span className="font-pixel text-[0.62rem] leading-relaxed sm:text-xs">Retr0school</span>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden />
    </Link>
  );
}
