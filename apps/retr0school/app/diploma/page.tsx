import type { Metadata } from "next";
import { DiplomaHub } from "@/components/near/diploma-hub";

export const metadata: Metadata = {
  title: "NEAR diploma",
  description: "Pass the NEAR quiz, connect a testnet wallet, and mint a soulbound diploma NFT on NEAR.",
};

export default function DiplomaPage() {
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">NEAR track · on-chain credential</p>
      <h1 className="mt-3 font-pixel text-title">Your NEAR diploma</h1>
      <p className="mt-3 max-w-lesson text-lead text-muted">
        Mint a soulbound NEP-171 NFT on NEAR testnet, verify any account, or share a public diploma page. One diploma per account, minted only with a grader signature the contract verifies.
      </p>
      <DiplomaHub />
    </main>
  );
}
