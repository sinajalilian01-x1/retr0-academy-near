import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // The diploma art route reads this font from disk at runtime.
  outputFileTracingIncludes: {
    "/api/diploma/[track]/[account]": ["./assets/fonts/PressStart2P-Regular.ttf"],
    "/d/[account]": ["./assets/fonts/PressStart2P-Regular.ttf"],
    // Retr0 Tutor reads public lessons at runtime. Quiz files and the exam bank are deliberately not included.
    "/api/tutor": ["./content/**/*.mdx", "./content/**/_track.json", "./content-advanced/*.mdx"],
  },
  serverExternalPackages: [
    "quickjs-emscripten",
    "@jitl/quickjs-wasmfile-release-sync",
    "shiki",
    "@shikijs/core",
    "@shikijs/engine-javascript",
    "@shikijs/langs",
    "@shikijs/themes",
  ],

  async redirects() {
    return [
      { source: "/web3", destination: "/fundamentals", permanent: true },
      { source: "/web3/what-is-blockchain", destination: "/fundamentals/what-is-blockchain", permanent: true },
      { source: "/web3/wallets-and-keys", destination: "/fundamentals/wallets-and-keys", permanent: true },
      { source: "/web3/transactions-and-gas", destination: "/fundamentals/transactions-and-gas", permanent: true },
      { source: "/web3/smart-contracts", destination: "/fundamentals/smart-contracts", permanent: true },
      { source: "/web3/solidity-intro", destination: "/fundamentals/smart-contracts", permanent: true },
      { source: "/web3/tokens-erc20", destination: "/fundamentals/tokens-and-nfts", permanent: true },
      { source: "/web3/nfts-erc721", destination: "/fundamentals/tokens-and-nfts", permanent: true },
      { source: "/web3/connecting-a-dapp", destination: "/dapp/connect-a-wallet", permanent: true },
      { source: "/web3/quiz", destination: "/fundamentals/quiz", permanent: true },
      { source: "/near/accounts-and-named-accounts", destination: "/fundamentals/accounts-and-named-accounts", permanent: true },
      { source: "/near/access-keys", destination: "/contracts/access-keys", permanent: true },
      { source: "/near/gas-and-storage", destination: "/fundamentals/transactions-and-gas", permanent: true },
      { source: "/near/view-vs-change-calls", destination: "/dapp/view-vs-change-calls", permanent: true },
      { source: "/near/wallet-selector", destination: "/dapp/connect-a-wallet", permanent: true },
      { source: "/near/fungible-tokens-nep-141", destination: "/tokens/fungible-tokens-nep-141", permanent: true },
      { source: "/near/nfts-nep-171", destination: "/tokens/nfts-nep-171", permanent: true },
      { source: "/near/your-first-contract", destination: "/contracts/writing-and-testing-a-contract", permanent: true },
      { source: "/near/intents-and-chain-signatures", destination: "/fundamentals/intents-and-chain-signatures", permanent: true },
      { source: "/advanced/writing-and-testing-a-contract", destination: "/contracts/writing-and-testing-a-contract", permanent: true },
      { source: "/advanced/storage-and-collections", destination: "/contracts/storage-and-collections", permanent: true },
      { source: "/advanced/promises-and-callbacks", destination: "/contracts/promises-and-callbacks", permanent: true },
      { source: "/advanced/nep-141-fungible-token", destination: "/tokens/fungible-tokens-nep-141", permanent: true },
      { source: "/advanced/nep-171-nft-minting", destination: "/tokens/nfts-nep-171", permanent: true },
      { source: "/advanced/access-keys-and-function-call-keys", destination: "/contracts/access-keys", permanent: true },
      { source: "/advanced/frontend-dapp-with-near-connect", destination: "/dapp/connect-a-wallet", permanent: true },
      { source: "/advanced/deploying-to-testnet", destination: "/contracts/deploying-to-testnet", permanent: true },
    ];
  },
};

export default nextConfig;
