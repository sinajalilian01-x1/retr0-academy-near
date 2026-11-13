import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiplomaCard } from "@/components/near/diploma-card";
import { ShareButton } from "@/components/near/share-button";
import { ACCOUNT_RE, NEAR_TRACK, SITE_URL, explorerToken, verifyDiploma } from "@/lib/near";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ account: string }> };

async function load(params: Props["params"]) {
  const { account: raw } = await params;
  const account = decodeURIComponent(raw).toLowerCase();
  if (!ACCOUNT_RE.test(account)) notFound();
  const diploma = await verifyDiploma(account, NEAR_TRACK).catch(() => null);
  return { account, diploma };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { account, diploma } = await load(params);
  const title = diploma ? `${account} earned the NEAR Developer Certificate` : `${account} on Retr0 Academy`;
  const description = diploma
    ? `${diploma.track_title}: ${diploma.score}/${diploma.max_score} on ${diploma.date}. Soulbound NEP-171 credential on NEAR testnet, verifiable by anyone.`
    : "Learn NEAR, pass the final exam and mint a soulbound NEAR Developer Certificate.";
  const image = { url: `${SITE_URL}/api/diploma/${NEAR_TRACK}/${encodeURIComponent(account)}`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    alternates: { canonical: `/d/${account}` },
    openGraph: { title, description, url: `${SITE_URL}/d/${account}`, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function SharedDiplomaPage({ params }: Props) {
  const { account, diploma } = await load(params);
  return (
    <main id="content" className="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
      <p className="font-pixel text-[0.65rem] uppercase tracking-eyebrow text-muted">Shared credential</p>
      <h1 className="mt-3 break-all font-pixel text-title">{account}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
        {diploma ? (
          <div className="flex flex-col gap-4">
            <DiplomaCard diploma={diploma} />
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <ShareButton accountId={account} score={diploma.score} maxScore={diploma.max_score} />
              <a className="font-medium text-info underline underline-offset-4" href={explorerToken(diploma.token_id)} target="_blank" rel="noopener">
                Token on explorer ↗
              </a>
            </div>
          </div>
        ) : (
          <p data-testid="verify-none" className="rounded-md border-2 border-line bg-elevated p-4 text-ink">
            No NEAR Developer Certificate for <span className="font-mono">{account}</span> yet.
          </p>
        )}
        <div className="flex flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/diploma/${NEAR_TRACK}/${encodeURIComponent(account)}`}
            alt={`Certificate art for ${account}`}
            width={1200}
            height={630}
            className="h-auto w-full border-2 border-line"
            data-testid="diploma-art"
          />
          <p className="text-sm text-muted">
            Read live from the contract with <code className="font-mono">verify_diploma</code>.{" "}
            <Link className="text-info underline underline-offset-4" href="/near">
              Earn your own certificate →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
