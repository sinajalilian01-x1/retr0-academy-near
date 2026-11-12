import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteProvider } from "@/components/site-provider";
import { NearWalletProvider } from "@/components/near/wallet-provider";
import { getSearchIndex, getTracks } from "@/lib/content";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const themeBoot = `(function(){try{var stored=localStorage.getItem("w3h-theme");var dark=stored!=="light";var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

const siteDescription =
  "The W3Schools of NEAR. Learn NEAR step by step, run every example in Code E, pass the quiz, and mint a soulbound diploma NFT on NEAR testnet.";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://retr0school-near.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Retr0 Academy on NEAR",
    template: "%s · Retr0 Academy",
  },
  description: siteDescription,
  applicationName: "Retr0 Academy",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Retr0 Academy on NEAR",
    description: siteDescription,
    url: siteUrl,
    siteName: "Retr0 Academy on NEAR",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retr0 Academy on NEAR",
    description: siteDescription,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tracks = getTracks().map((track) => ({ slug: track.slug, title: track.title }));
  const entries = getSearchIndex();

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${pixel.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-elevated focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteProvider entries={entries}>
          <NearWalletProvider>
            <Header />
            {children}
            <Footer tracks={tracks} />
          </NearWalletProvider>
        </SiteProvider>
      </body>
    </html>
  );
}
