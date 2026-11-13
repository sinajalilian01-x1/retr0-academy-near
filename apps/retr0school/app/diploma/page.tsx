import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { DiplomaHub } from "@/components/near/diploma-hub";

export const metadata: Metadata = pageMeta("/diploma", "NEAR Developer Certificate", "Pass the final exam, connect a NEAR wallet, and mint a soulbound NEAR Developer Certificate NFT.");

export default function DiplomaPage() {
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">NEAR Developer path · on-chain credential</p>
      <h1 className="mt-3 font-pixel text-title">Your NEAR Developer Certificate</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Mint a soulbound NEP-171 NFT on NEAR mainnet, verify any account, or share a public certificate page. One per account, minted only with a grader signature for a passed final exam, which the contract verifies. Your score and grade are stored in the NFT.
      </p>
      <DiplomaHub />
    </main>
  );
}
