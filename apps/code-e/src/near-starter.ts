import type { ProjectFile } from './types'

/** Where the Retr0school NEAR app lives. Override with VITE_RETR0SCHOOL_URL at build time. */
export const RETR0SCHOOL_URL = (import.meta.env.VITE_RETR0SCHOOL_URL || 'https://retr0school-near.vercel.app').replace(/\/+$/, '')
export const DIPLOMA_CONTRACT = import.meta.env.VITE_DIPLOMA_CONTRACT || 'diploma.retr0school.testnet'

/**
 * NEAR starter: "connect" a testnet account (read-only, the preview is sandboxed so wallets cannot open here),
 * read its balance with view_account, and call the diploma contract's verify_diploma view method.
 */
export const nearStarterFiles = (): ProjectFile[] => [
  {
    name: 'index.html',
    content: `<main>
  <p class="eyebrow">Code E × NEAR testnet</p>
  <h1>NEAR starter</h1>
  <p>Connect a testnet account, then read the chain with view calls. No keys, no gas.</p>

  <div class="row">
    <input id="account" value="demo-learner.retr0school.testnet" spellcheck="false" aria-label="NEAR account id">
    <button type="button" id="connect">Connect</button>
  </div>
  <p class="hint">Want to sign transactions? <a id="wallet-link" target="_blank" rel="noopener">Connect a real wallet in Retr0school ↗</a></p>

  <section>
    <h2>Account</h2>
    <pre id="account-out">Not connected.</pre>
  </section>
  <section>
    <h2>verify_diploma on <code id="contract"></code></h2>
    <button type="button" id="verify" disabled>Verify diploma</button>
    <pre id="diploma-out">Connect first.</pre>
  </section>
</main>
`,
  },
  {
    name: 'style.css',
    content: `body {
  margin: 0;
  min-height: 100vh;
  background: #0d0b1a;
  color: #ece8ff;
  font-family: "Segoe UI", system-ui, sans-serif;
}

main {
  width: min(560px, calc(100% - 32px));
  margin: 32px auto;
}

.eyebrow {
  margin: 0;
  color: #00ec97;
  font: 700 11px/1.4 ui-monospace, monospace;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 6px 0 8px;
  font-size: 30px;
  letter-spacing: -0.03em;
}

h2 {
  margin: 24px 0 8px;
  font-size: 15px;
}

.row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

input {
  flex: 1;
  border: 2px solid #3a3466;
  background: #17132b;
  color: inherit;
  padding: 10px 12px;
  font: 14px ui-monospace, monospace;
}

button {
  border: 2px solid #ece8ff;
  padding: 10px 16px;
  background: #ff3fa4;
  color: #1a0a14;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

pre {
  margin: 8px 0 0;
  border: 1px solid #3a3466;
  background: #17132b;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
}

a {
  color: #00ec97;
}

.hint {
  font-size: 13px;
  color: #b9b4e6;
}
`,
  },
  {
    name: 'script.js',
    content: `const RPC = "https://rpc.testnet.near.org";
const CONTRACT = "${DIPLOMA_CONTRACT}";
const RETR0SCHOOL = "${RETR0SCHOOL_URL}";

let accountId = null;

document.querySelector("#contract").textContent = CONTRACT;
document.querySelector("#wallet-link").href = RETR0SCHOOL + "/diploma";

async function rpc(params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "code-e", method: "query", params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.cause ? json.error.cause.name : json.error.message);
  return json.result;
}

// View call: read a contract method for free.
async function view(contractId, method, args) {
  const result = await rpc({
    request_type: "call_function",
    finality: "final",
    account_id: contractId,
    method_name: method,
    args_base64: btoa(JSON.stringify(args || {})),
  });
  return JSON.parse(new TextDecoder().decode(new Uint8Array(result.result)));
}

// The preview is sandboxed (no forms), so use a click handler instead of a form submit.
document.querySelector("#connect").addEventListener("click", async () => {
  const id = document.querySelector("#account").value.trim().toLowerCase();
  const out = document.querySelector("#account-out");
  out.textContent = "Looking up " + id + "...";
  try {
    const a = await rpc({ request_type: "view_account", finality: "final", account_id: id });
    accountId = id;
    const near = Number(BigInt(a.amount) / 10n ** 20n) / 10000;
    out.textContent = "Connected (read-only): " + id + "\\nBalance: " + near + " NEAR\\nStorage: " + a.storage_usage + " bytes";
    document.querySelector("#verify").disabled = false;
    console.log("Connected", id);
  } catch (error) {
    out.textContent = "Could not find " + id + ": " + error.message;
  }
});

document.querySelector("#verify").addEventListener("click", async () => {
  const out = document.querySelector("#diploma-out");
  out.textContent = "Calling verify_diploma...";
  try {
    const diploma = await view(CONTRACT, "verify_diploma", { account_id: accountId, track: "near" });
    out.textContent = diploma
      ? "Valid diploma: " + diploma.track_title + ", " + diploma.score + "/" + diploma.max_score + " on " + diploma.date
      : "No diploma yet. Earn one at " + RETR0SCHOOL + "/near";
    console.log("verify_diploma", diploma);
  } catch (error) {
    out.textContent = "Error: " + error.message;
  }
});
`,
  },
]
