import type { SharePayload } from "@/lib/code-e";

export type PlaygroundExample = SharePayload & { id: string; label: string };

export const welcomeExample: PlaygroundExample = {
  id: "welcome",
  label: "Welcome",
  html: `<h1>Retr0 Academy playground</h1>
<p id="out">Edit the panels, then press Run.</p>`,
  css: `body {
  margin: 0;
  padding: 1rem;
  font-family: Georgia, serif;
  background: #0d0b1a;
  color: #ece8ff;
}
h1 {
  margin-top: 0;
  font-size: 1.6rem;
  line-height: 1.25;
  color: #ff3fa4;
}`,
  js: `document.getElementById("out").textContent = "Playground ready.";`,
};

export const htmlExample: PlaygroundExample = {
  id: "html",
  label: "HTML page",
  html: `<header>
  <p class="eyebrow">Retr0 Academy</p>
  <h1>A simple HTML page</h1>
</header>
<main>
  <p>HTML is the structure of a page: headings, paragraphs, lists, and links.</p>
  <ul>
    <li>Headings explain the outline</li>
    <li>Links take people somewhere</li>
  </ul>
  <a href="https://retr0school-near.vercel.app/html">Learn HTML →</a>
</main>`,
  css: `body {
  margin: 0;
  font-family: Georgia, serif;
  background: #0d0b1a;
  color: #ece8ff;
  padding: 2rem;
}
.eyebrow { color: #00ec97; letter-spacing: 0.12em; text-transform: uppercase; font-size: 12px; }
h1 { margin: 0.4rem 0 1rem; }
a { color: #ff3fa4; }`,
  js: "",
};

export const cssExample: PlaygroundExample = {
  id: "css",
  label: "CSS card",
  html: `<article class="card">
  <p class="eyebrow">CSS</p>
  <h1>Style a card</h1>
  <p>Borders, color, and spacing do most of the work.</p>
</article>`,
  css: `body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  background: #0d0b1a;
  font-family: system-ui, sans-serif;
}
.card {
  width: min(320px, 90vw);
  padding: 1.5rem;
  border: 2px solid #ff3fa4;
  background: #17132b;
  color: #ece8ff;
  box-shadow: 8px 8px 0 #00ec97;
}
.eyebrow { margin: 0; color: #00ec97; letter-spacing: 0.14em; text-transform: uppercase; font-size: 11px; }
h1 { margin: 0.5rem 0; font-size: 1.6rem; }`,
  js: "",
};

export const jsExample: PlaygroundExample = {
  id: "js",
  label: "JS counter",
  html: `<main>
  <h1>Click counter</h1>
  <p>You clicked <strong id="count">0</strong> times.</p>
  <button type="button" id="btn">Click me</button>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0d0b1a;
  color: #ece8ff;
  font-family: system-ui, sans-serif;
}
button {
  border: 2px solid #ece8ff;
  background: #ff3fa4;
  color: #1a0a14;
  font-weight: 700;
  padding: 0.7rem 1.1rem;
  cursor: pointer;
}`,
  js: `let n = 0;
const out = document.getElementById("count");
document.getElementById("btn").addEventListener("click", () => {
  n += 1;
  out.textContent = String(n);
});`,
};

export const nearExample: PlaygroundExample = {
  id: "near",
  label: "NEAR diploma check",
  html: `<main>
  <p class="eyebrow">Retr0 Academy × NEAR testnet</p>
  <h1>NEAR starter</h1>
  <p>Look up a testnet account and call <code>verify_diploma</code>. No keys, no gas.</p>
  <div class="row">
    <input id="account" value="demo-learner.retr0school.testnet" spellcheck="false" aria-label="NEAR account id">
    <button type="button" id="connect">Connect</button>
  </div>
  <section>
    <h2>Account</h2>
    <pre id="account-out">Not connected.</pre>
  </section>
  <section>
    <h2>verify_diploma</h2>
    <button type="button" id="verify" disabled>Verify diploma</button>
    <pre id="diploma-out">Connect first.</pre>
  </section>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  background: #0d0b1a;
  color: #ece8ff;
  font-family: "Segoe UI", system-ui, sans-serif;
}
main { width: min(560px, calc(100% - 32px)); margin: 32px auto; }
.eyebrow { margin: 0; color: #00ec97; font: 700 11px/1.4 ui-monospace, monospace; letter-spacing: 0.14em; text-transform: uppercase; }
h1 { margin: 6px 0 8px; font-size: 30px; }
h2 { margin: 24px 0 8px; font-size: 15px; }
.row { display: flex; gap: 8px; margin-top: 16px; }
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
button:disabled { opacity: 0.5; cursor: not-allowed; }
pre {
  margin: 8px 0 0;
  border: 1px solid #3a3466;
  background: #17132b;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
}
code { font-family: ui-monospace, monospace; color: #00ec97; }`,
  js: `const RPC = "https://rpc.testnet.fastnear.com";
const CONTRACT = "diploma.retr0school.testnet";
let accountId = null;

async function rpc(params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "playground", method: "query", params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.cause ? json.error.cause.name : json.error.message);
  return json.result;
}

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
      : "No diploma yet for " + accountId;
  } catch (error) {
    out.textContent = "Error: " + error.message;
  }
});`,
};

export const playgroundExamples: PlaygroundExample[] = [welcomeExample, htmlExample, cssExample, jsExample, nearExample];

export function exampleById(id: string) {
  return playgroundExamples.find((example) => example.id === id) ?? null;
}
