import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export const alt = "Learn Web3 with Retr0 Academy";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogCard("Retr0 Academy", "Learn Web3 with Retr0 Academy", "Learn NEAR, pass a hard server-graded exam, and mint a soulbound NEAR Developer Certificate.");
}
