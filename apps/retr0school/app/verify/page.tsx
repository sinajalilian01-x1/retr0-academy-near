import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifySearch } from "@/components/near/verify-search";
import { ACCOUNT_RE, DIPLOMA_CONTRACT, TESTNET_DIPLOMA_CONTRACT } from "@/lib/near";

export const metadata: Metadata = pageMeta(
  "/verify",
  "Verify a developer",
  "Check any NEAR account for a soulbound NEAR Developer Certificate and a shipped contract, read live from NEAR mainnet.",
);

type Props = { searchParams: Promise<{ account?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { account } = await searchParams;
  const clean = account?.trim().toLowerCase();
  if (clean && ACCOUNT_RE.test(clean)) redirect(`/verify/${encodeURIComponent(clean)}`);

  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Public credential check</p>
      <h1 className="mt-3 font-pixel text-title">Verify a developer</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Hiring or reviewing a builder? Enter their NEAR account. We read their soulbound certificates straight from{" "}
        <code className="font-mono">{DIPLOMA_CONTRACT}</code> with <code className="font-mono">nft_tokens_for_owner</code>, and
        show the contract they shipped in the final project. No wallet, no login. Certificates from the earlier testnet beta (
        <code className="font-mono">{TESTNET_DIPLOMA_CONTRACT}</code>) still verify for <code className="font-mono">.testnet</code> accounts and are labelled
        as beta.
      </p>
      <div className="mt-8">
        <VerifySearch />
      </div>
      <p className="mt-6 text-sm text-muted">
        Try{" "}
        <Link className="text-info underline underline-offset-4" href="/verify/hlpok1lad.tg" data-testid="verify-example">
          hlpok1lad.tg
        </Link>{" "}
        (mainnet), or the beta accounts{" "}
        <Link className="text-info underline underline-offset-4" href="/verify/demo-learner.retr0school.testnet">
          demo-learner.retr0school.testnet
        </Link>{" "}
        and{" "}
        <Link className="text-info underline underline-offset-4" href="/verify/exam-tester.retr0school.testnet">
          exam-tester.retr0school.testnet
        </Link>
        .
      </p>
    </main>
  );
}
