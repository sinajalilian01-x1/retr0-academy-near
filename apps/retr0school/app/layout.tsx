import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Press_Start_2P } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteProvider } from "@/components/site-provider";
import { getSearchIndex, getTracks } from "@/lib/content";
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
  "Practical tutorials for HTML, CSS, JavaScript, and Web3. Clean examples, a live editor, and quizzes that stay in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL("https://w3hschool.vercel.app"),
  title: {
    default: "Retr0school",
    template: "%s · Retr0school",
  },
  description: siteDescription,
  applicationName: "Retr0school",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Retr0school",
    description: siteDescription,
    url: "https://w3hschool.vercel.app",
    siteName: "Retr0school",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retr0school",
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
          <Header />
          {children}
          <Footer tracks={tracks} />
        </SiteProvider>
      </body>
    </html>
  );
}
