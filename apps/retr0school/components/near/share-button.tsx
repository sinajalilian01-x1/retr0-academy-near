import { SITE_URL } from "@/lib/near";

export function shareUrlFor(accountId: string) {
  return `${SITE_URL}/d/${encodeURIComponent(accountId)}`;
}

/** Opens an X post intent with the diploma share page (its card shows the diploma art). */
export function ShareButton({ accountId, score, maxScore }: { accountId: string; score: number; maxScore: number }) {
  const text = `I just earned my on-chain NEAR diploma on Retr0 Academy 🎓 ${score}/${maxScore}, soulbound NEP-171 on NEAR mainnet. Built at NEAR HACKATHON @NEARProtocol #NEARHackathon`;
  const href = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrlFor(accountId))}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      data-testid="share-diploma"
      className="inline-flex h-10 items-center gap-2 rounded-md border-2 border-ink bg-accent px-4 text-sm font-medium text-accent-ink shadow-md hover:bg-accent-hover"
    >
      Share my diploma on X ↗
    </a>
  );
}
