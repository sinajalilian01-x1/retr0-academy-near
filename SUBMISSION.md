# NEAR HACKATHON submission kit

Everything here is a draft for Sina to review. Nothing has been posted or submitted.

## Demo video script (about 75 seconds)

| Time | Screen | Voice-over |
| --- | --- | --- |
| 0:00-0:08 | Retr0school home, hero "Learn NEAR. Earn it on-chain." | "Online course certificates prove nothing. Anyone can fake a PDF. So we made the W3Schools of NEAR, where your diploma lives on chain." |
| 0:08-0:20 | `/near` track, open "View vs Change Calls", press **Verify** in the example | "Nine short lessons. Every example runs live against NEAR testnet. This one calls our diploma contract with a free view call." |
| 0:20-0:30 | Click **Open in Code E**, Code E opens with the same code, press Run | "One click sends the example to Code E, our playground, so you can break it and rebuild it." |
| 0:30-0:42 | `/near/quiz`, answer, **Score my quiz**, green "Passed" box | "Pass the quiz and the diploma unlocks. The website does not decide that: the smart contract grades your answers itself." |
| 0:42-0:58 | `/diploma`, **Connect wallet** (MyNearWallet), **Mint diploma**, approve, diploma card appears | "Connect any NEAR wallet through Wallet Selector, mint, and you get a soulbound NEP-171 NFT: one per account, it can never be transferred or sold." |
| 0:58-1:08 | Click **View mint transaction** → NearBlocks testnet; then the public verify link | "Here is the mint on the explorer. And anyone, an employer or another dApp, can verify it with one view call. No wallet needed." |
| 1:08-1:15 | Verify page with the card | "Retr0school and Code E. Learn NEAR, prove it on NEAR. Built at NEAR HACKATHON." |

Recording tips: use a fresh testnet account with a short name, dark theme, 1280×800 browser, and zoom to 110%.

## Draft X post

> Online course certificates prove nothing. So I built the W3Schools of NEAR 🎓
>
> Learn NEAR in Retr0school → run every example in Code E → pass a quiz the smart contract grades itself → mint a soulbound NEP-171 diploma anyone can verify with one view call.
>
> Built at NEAR HACKATHON @NEARProtocol #NEARHackathon
>
> Try it: https://retr0school-near.vercel.app
> Code: <public GitHub repo link>
>
> What should the next track be: Intents or Chain Signatures?

(Optional extra tags: @NearLegion @NearBuilders. Attach the demo video.)

## Submission fields (Sina decides, do not guess)

| Field | Suggested / status |
| --- | --- |
| projectName | Retr0school × Code E: the W3Schools of NEAR (Sina to confirm) |
| leadName | Sina to provide |
| email | Sina to provide (max 2 projects per email; TriagePay is the other one) |
| size | Sina to provide |
| tracks | `nfts` (primary), optionally `open` |
| nearAddress | Sina's own **mainnet** account for the payout (never the testnet accounts in this repo) |
| projectUrl | public GitHub repo, once pushed |
| demoUrl | the X post link |
| idea | draft below |
| consent | only after Sina agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

Draft `idea` (under 2000 characters):

> Online course certificates are easy to fake, can't be checked without trusting the issuer, and teach nothing about the chain they claim to cover. Retr0school × Code E is "the W3Schools of NEAR": a NEAR track of 9 short lessons (named accounts, access keys, gas and storage, view vs change calls, Wallet Selector, NEP-141, NEP-171, a first Rust contract, Intents and Chain Signatures) whose live examples call NEAR testnet, with one-click "Open in Code E" into a browser playground that also ships a NEAR starter. Passing the 8-question quiz unlocks a diploma page: connect a wallet through NEAR Wallet Selector (MyNearWallet, Meteor) and call mint_diploma on our Rust contract. The contract grades the answers on chain and mints a soulbound NEP-171 NFT, one per account per track, with track, score, owner and date in the metadata. Anyone can check a credential on the public verify page or with the verify_diploma view method, no wallet needed. NEAR fits because named accounts make the credential human-readable, NEP-171 makes it a standard asset explorers already show, view calls make verification free, and storage staking lets the learner pay for their own record with a refunded deposit. Retr0school and Code E existed before the hackathon as off-chain apps; all NEAR work is new and separated by the pre-hackathon-baseline tag.

## Before submitting

- [ ] Push this repo to Sina's own GitHub account and make it public (not Yura's KhomDev account).
- [ ] Tag the final commit `hackathon-submission` and push tags (`git push --tags`).
- [ ] Mint once from Sina's own testnet wallet on the live site so the demo uses a real wallet flow.
- [ ] Record the video, post on X, then submit at https://nearhackathon.com/#apply before **2026-11-14 23:59 UTC** (Sunday 00:59 Budapest time).
- [ ] Keep both Vercel deployments up until at least 2026-11-25.
