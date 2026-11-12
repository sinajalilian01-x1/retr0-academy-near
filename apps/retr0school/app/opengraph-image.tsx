import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export const alt = "Retr0school";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return ogCard("Learn to code", "Build for the web", "Practical tutorials. Clean code. Real results.");
}
