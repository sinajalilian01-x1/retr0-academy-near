# NEAR HACKATHON submission kit

Everything here is a draft for Sina to review. Nothing has been posted or submitted.

## How judging works (from nearhackathon.com and HACKATHON.md)

- Claude Code and Codex screen every project first: does it run, and does it do what the README says? They write a report and a preliminary score. Human judges decide.
- Previous NEAR hackathons judged **technical implementation, design, impact, originality and sustainability**.
- Required: a public repo (with a LICENSE and a reproducible README), and a public X post saying it was built at NEAR HACKATHON, tagging @NEARProtocol and #NEARHackathon, with a demo video. A hosted demo is a plus; keep it up until at least 2026-11-18, ideally 2026-11-25.
- Track fit: **NFTs That Do Something** ("NFTs that carry credentials, memberships or access rights", NEP-171) is the primary track. **Open Innovation** is secondary.

## Criteria → what we did

| Criterion | What judges will see |
| --- | --- |
| Runs and matches the README (AI screen) | Live site and Code E, `npm run test:e2e` checks every judge flow on the live site, a practice exam paper for judges without a wallet, step-by-step "do X → see Y" checks, CLI view calls, a testnet mint from a passed exam linked in the README, `cargo test` (22 tests) and `npm run build` pass, no secrets needed to run locally (practice bank) |
| Technical implementation | Rust NEP-171/177/181 contract with ed25519 attestations, soulbound transfers, in-place upgrade + `rebrand` data fix; server-graded exam with a sealed session, option shuffles, server timer, replay guard, QuickJS sandbox with hidden tests, encrypted bank; NEP-413 + `view_access_key` server-side holder lock; rate limits via Runtime Cache |
| Design | Original retro look kept; 22 original animated diagrams; numbered NEAR Developer path; fewer tabs; mobile checked on 7 main pages |
| Impact | A free, complete NEAR developer curriculum (24 NEAR lessons including 7 advanced, plus 37 supporting web lessons) whose certificate means something: hard exam, verifiable by anyone with one view call, usable by other dApps for gating |
| Originality | The NFT is earned by a proctor-free but cheat-resistant exam, carries a grade on chain, and unlocks content only through a wallet signature that the server verifies, not a client check |
| Sustainability | Learners pay their own storage; content is MDX anyone can extend; exam bank format and encryption script documented; contract upgradeable with a tested migration path; MIT license |
| NFTs That Do Something | Credential (score + grade in metadata), soulbound, access right (Advanced NEAR), verifiable (verify page, leaderboard, share card) |

## Demo video script (about 100 seconds)

| Time | Screen | Voice-over |
| --- | --- | --- |
| 0:00-0:08 | Home page, hero, right column with the numbered NEAR Developer path | "Online certificates prove nothing. Retr0 Academy on NEAR gives you one that does." |
| 0:08-0:20 | Subject bar → NEAR → Web3 Fundamentals → Transactions lesson; the animated transaction diagram plays; scroll to a cross-contract lesson | "A full NEAR developer path, with animated diagrams for the hard parts: transactions, cross-contract calls, storage staking." |
| 0:20-0:30 | Advanced JavaScript → Mini app: live NEAR account lookup; click **Open in Playground** → **Open in Code E** | "Every example runs. This one reads live testnet data, and one click takes it into Code E." |
| 0:30-0:50 | `/near/quiz`: prerequisites checked → **Start** → timer 40:00, a predict-the-output question, a coding task, **Run visible tests** | "The certificate needs a real final exam: 25 random questions from a 67-question bank, three coding tasks, 40 minutes, 80% to pass. Answers and hidden tests never leave the server." |
| 0:50-1:00 | Submit → results: score, grade, per-topic bars, test results | "The server grades it, runs your code in a sandbox, and shows exactly where you stand." |
| 1:00-1:15 | **Connect wallet** → **Mint** → approve → certificate card with grade | "Pass, and the server signs your score for your account only. The NEAR contract checks that signature and the pass mark, then mints a soulbound NFT with your grade in it." |
| 1:15-1:30 | `/advanced/testing-contracts` locked → **Unlock with signature** → sign → lesson opens | "The NFT does something. Advanced NEAR unlocks only after your wallet signs a message and our server checks the key and the certificate on chain." |
| 1:30-1:40 | `/verify?account=…`, then the NearBlocks mint transaction | "Anyone can verify it with one free view call. Built at NEAR HACKATHON." |

Recording tips: fresh testnet account with a short name, dark theme, 1280×800 window at 110% zoom. Pass the four course quizzes before recording. To show a pass in the video, either take the exam for real or cut to the results screen after submitting.

### Add-on shots: AI tutor, ship to chain, verify (about 30 seconds, append or swap in)

| Time | Screen | Voice-over |
| --- | --- | --- |
| +0:00-0:08 | Home: move the mouse, the 3D CRT robot follows it and blinks; click it → Retr0 Tutor opens | "Meet Retr0, the academy's AI tutor, running on NEAR AI Cloud." |
| +0:08-0:16 | On `/contracts/access-keys` ask "What is a function-call key?" → streamed answer with S1 chips and lesson links | "It answers from our own lessons and links the ones it used." |
| +0:16-0:22 | `/playground`, typo `consol.log` → **Explain my error** → fix shown | "In the Playground it reads your code and console errors." |
| +0:22-0:25 | Ask "give me the final exam answers" → polite refusal; open `/near/quiz` → tutor button gone | "And it won't help you cheat. It switches off during the exam." |
| +0:25-0:32 | `/dapp/ship-to-chain` submit → `/verify/demo-learner.retr0school.testnet` with **Shipped** and the live `get_greeting()` | "The final project: ship your own contract. The server checks it on chain, and anyone can verify the developer." |

## Draft X post

> Online course certificates prove nothing. So I built Retr0 Academy on NEAR 🎓
>
> Learn NEAR with animated, runnable lessons → pass a hard final exam (25 random questions + 3 coding tasks, graded on the server) → mint a soulbound NEAR Developer Certificate with your grade on chain → it unlocks Advanced NEAR through a wallet signature the server verifies.
>
> NEAR makes it work: the contract verifies the grader's ed25519 signature, the NFT is NEP-171, and anyone can check it with one free view call.
>
> Built at NEAR HACKATHON @NEARProtocol #NEARHackathon
>
> Try it: https://retr0school-near.vercel.app
> Code: <public GitHub repo link>
>
> What should the next advanced lesson cover: Intents or Chain Signatures?

(Optional extra tags: @NearLegion @NearBuilders. Attach the demo video.)

## Submission fields (Sina decides, do not guess)

| Field | Suggested / status |
| --- | --- |
| projectName | Retr0 Academy on NEAR (Sina to confirm) |
| leadName | Sina to provide |
| email | Sina to provide (max 2 projects per email) |
| size | Sina to provide |
| tracks | `nfts` (primary), `open` |
| nearAddress | Sina's own **mainnet** account for the payout (never the testnet accounts in this repo) |
| projectUrl | public GitHub repo, once pushed |
| demoUrl | the X post link |
| idea | draft below |
| consent | only after Sina agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." |

Draft `idea` (under 2000 characters):

> Online course certificates are easy to fake, impossible to verify without trusting the issuer, and usually earned by guessing through a basic quiz. Retr0 Academy on NEAR is a Web3 developer school with a certificate that means something. Learners follow a NEAR Developer path (Web3 Fundamentals, NEAR Smart Contracts in Rust, Tokens & NFTs, Build a NEAR dApp) with 22 original animated diagrams and runnable examples that open in a Playground and in Code E; supporting courses cover HTML, CSS and JavaScript up to advanced level. The certificate requires a hard final exam: 25 questions drawn from a 67-question bank of code-reading, predict-the-output and debugging items, plus three coding tasks auto-graded on the server against hidden tests in a QuickJS WebAssembly sandbox, with a 40-minute server-enforced timer, an 80% pass mark and a cooldown. The bank is encrypted in the repo and answers never reach the browser. On a pass, the server signs an ed25519 attestation bound to the learner's account; our Rust NEP-171 contract verifies it with env::ed25519_verify, checks expiry and the on-chain pass mark, and mints a soulbound certificate with the score and letter grade in its metadata. The NFT does something: Advanced NEAR (cross-contract calls, storage staking, Chain Signatures, Intents, testing, near-api-js, mainnet deploys) is rendered only after the learner signs a NEP-413 message, which the server checks against the account's full-access key and verify_diploma. Anyone can verify a certificate with one free view call, on a public verify page or leaderboard. NEAR fits because named accounts make credentials readable, NEP-171 makes them standard assets, view calls make verification free, and storage staking lets learners pay for their own record. Retr0 Academy and Code E existed as off-chain apps before the hackathon; all NEAR work is new and separated by the pre-hackathon-baseline tag.

## Before submitting

- [ ] Push this repo to Sina's own GitHub account and make it public (not Yura's KhomDev account).
- [ ] Tag the final commit `hackathon-submission` and push tags.
- [ ] Mint from Sina's own testnet wallet on the live site for the video.
- [ ] Record the video, post on X, then submit at https://nearhackathon.com/#apply before **2026-11-14 23:59 UTC** (Sunday 15 Nov, 00:59 Prague time).
- [ ] Keep both Vercel deployments up until at least 2026-11-25.
