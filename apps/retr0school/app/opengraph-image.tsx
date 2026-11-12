import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export const alt = "Retr0 Academy on NEAR";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogCard("Retr0 Academy on NEAR", "Learn NEAR from scratch", "Graduate on-chain with a soulbound diploma NFT.");
}
