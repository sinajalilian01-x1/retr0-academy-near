import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export const alt = "Learn Web3 with Retr0 Academy";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogCard("Retr0 Academy", "Learn Web3 with Retr0 Academy", "A NEAR-based coding academy for the web. Finish the NEAR track to mint a soulbound diploma NFT on testnet.");
}
