import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { VerifyForm } from "@/components/near/verify-form";
import { DIPLOMA_CONTRACT } from "@/lib/near";

export const metadata: Metadata = pageMeta("/verify", "Verify a certificate", "Check any NEAR account for a NEAR Developer Certificate (Retr0 Academy diploma NFT), straight from the smart contract.");

export default function VerifyPage() {
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Public credential check</p>
      <h1 className="mt-3 font-pixel text-title">Verify a certificate</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Enter a NEAR testnet account. This page calls the <code className="font-mono">verify_diploma</code> view method on{" "}
        <code className="font-mono">{DIPLOMA_CONTRACT}</code>. No wallet needed. Try{" "}
        <Link className="text-info underline underline-offset-4" href="/verify?account=demo-learner.retr0school.testnet">
          demo-learner.retr0school.testnet
        </Link>
        .
      </p>
      <VerifyForm />
    </main>
  );
}
