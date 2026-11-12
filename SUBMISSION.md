# NEAR HACKATHON submission kit

Everything here is a draft for Sina to review. Nothing has been posted or submitted.

## Demo video script (about 80 seconds)

| Time | Screen | Voice-over |
| --- | --- | --- |
| 0:00-0:08 | Retr0 Academy home, hero "Learn NEAR from scratch and graduate on-chain with Retr0 Academy." | "Online course certificates prove nothing. Anyone can fake a PDF. So we made Retr0 Academy on NEAR, where your diploma lives on chain." |
| 0:08-0:18 | `/near` track, open "View vs Change Calls", press **Verify** in the example | "Nine short lessons. Every example runs live against NEAR testnet. This one calls our diploma contract with a free view call." |
| 0:18-0:26 | Click **Open in Code E**, Code E opens with the same code, press Run | "One click sends the example to Code E, our playground, so you can break it and rebuild it." |
| 0:26-0:36 | `/near/quiz`, answer, **Score my quiz**, green "Passed" box | "The answer key never leaves our server. It grades you and signs the result, and the smart contract only accepts a grade with a valid signature for your account." |
| 0:36-0:50 | `/diploma`, **Connect wallet** (MyNearWallet), **Mint diploma**, approve, neon diploma art appears | "Connect any NEAR wallet, mint, and you get a soulbound NEP-171 NFT with this neon diploma as its art. One per account, it can never be sold." |
| 0:50-0:58 | Header shows **Holder**; open `/advanced`, then a lesson | "The NFT does something: holders get a badge and unlock the Advanced NEAR track: cross-contract calls, Chain Signatures, Intents." |
| 0:58-1:06 | Press **Share my diploma** → X compose window with the card preview | "Share it on X in one click. The link card is your diploma." |
| 1:06-1:14 | `/leaderboard`, then **View mint transaction** → NearBlocks | "The leaderboard reads every holder straight from the contract, and every mint is on the explorer." |
| 1:14-1:20 | Verify page with the card | "Retr0 Academy and Code E. Learn NEAR, prove it on NEAR. Built at NEAR HACKATHON." |

Recording tips: use a fresh testnet account with a short name, dark theme, 1280×800 browser, and zoom to 110%.

## Draft X post

> Online course certificates prove nothing. So I built Retr0 Academy on NEAR 🎓
>
> Learn NEAR in Retr0 Academy → run every example in Code E → pass a quiz (server-signed grade, verified on chain) → mint a soulbound NEP-171 diploma with neon art → unlock Advanced NEAR and climb the leaderboard. Anyone can verify it with one view call.
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
| projectName | Retr0 Academy × Code E (Sina to confirm) |
| leadName | Sina to provide |
| email | Sina to provide (max 2 projects per email) |
| size | Sina to provide |
| tracks | `nfts` (primary), optionally `open` |
| nearAddress | Sina's own **mainnet** account for the payout (never the testnet accounts in this repo) |
| projectUrl | public GitHub repo, once pushed |
| demoUrl | the X post link |
| idea | draft below |
| consent | only after Sina agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

Draft `idea` (under 2000 characters):

> Online course certificates are easy to fake, can't be checked without trusting the issuer, and teach nothing about the chain they claim to cover. Retr0 Academy × Code E is a retro academy for learning NEAR: 9 short NEAR lessons (accounts, access keys, gas and storage, view vs change calls, Wallet Selector, NEP-141, NEP-171, a first Rust contract, Intents and Chain Signatures) whose live examples call NEAR testnet, with one-click "Open in Code E" into a browser playground that also ships a NEAR starter. An 8-question quiz is graded on our server, whose answer key stays secret; it returns an ed25519-signed grade bound to the learner's account. The learner connects through NEAR Wallet Selector (MyNearWallet, Meteor) and calls mint_diploma; our Rust contract checks the signature with env::ed25519_verify, the expiry and the pass mark, then mints a soulbound NEP-171 NFT, one per account per track. Its media is a neon retro diploma rendered live from chain data. The NFT does something: holders get a badge and unlock an Advanced NEAR track (cross-contract calls, storage staking, Chain Signatures, Intents), can share their diploma on X with a card that shows the art, and appear on a public leaderboard read from the contract's NEP-181 enumeration. Anyone can verify a credential with one view call, no wallet needed. NEAR fits because named accounts make the credential human-readable, NEP-171 makes it a standard asset explorers show, view calls make verification free, and storage staking lets learners pay for their own record. Retr0 Academy and Code E existed before the hackathon as off-chain apps; all NEAR work is new and separated by the pre-hackathon-baseline tag.

## Before submitting

- [ ] Push this repo to Sina's own GitHub account and make it public (not Yura's KhomDev account).
- [ ] Tag the final commit `hackathon-submission` and push tags (`git push --tags`).
- [ ] Mint once from Sina's own testnet wallet on the live site so the demo uses a real wallet flow.
- [ ] Record the video, post on X, then submit at https://nearhackathon.com/#apply before **2026-11-14 23:59 UTC** (Sunday 00:59 Budapest time).
- [ ] Keep both Vercel deployments up until at least 2026-11-25.
