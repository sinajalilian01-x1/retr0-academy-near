import { clientIp, kvGet, kvSet, rateLimit } from "@/lib/rate-limit";
import { lessonAt, retrieve } from "@/lib/tutor/knowledge";
import { TUTOR_LIMITS, isExamPath, systemPrompt } from "@/lib/tutor/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Retr0 Tutor: streams an answer from NEAR AI Cloud (OpenAI-compatible API), grounded in lesson sections.
 *   POST { messages: [{role:"user"|"assistant", content}], path?, playground?: {html,css,js,errors} }
 *   -> text/plain stream. Sources used are in the X-Tutor-Sources header (JSON, URI-encoded).
 */
const NEAR_AI_URL = (process.env.NEAR_AI_BASE_URL || "https://cloud-api.near.ai/v1").replace(/\/+$/, "");
const MODELS = (process.env.TUTOR_MODELS || "anthropic/claude-haiku-5-5,openai/gpt-6-luna").split(",").map((m) => m.trim()).filter(Boolean);
const DAILY_GLOBAL_CAP = Number(process.env.TUTOR_DAILY_CAP || 5000);

type Msg = { role: "user" | "assistant"; content: string };

const dbg = (...a: unknown[]) => { if (process.env.TUTOR_DEBUG) console.log("tutor:", ...a); };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export async function POST(request: Request) {
  const key = process.env.NEAR_AI_API_KEY || process.env.NEARAI_API_KEY;
  if (!key) return json(503, { error: "The tutor is offline right now." });

  const origin = request.headers.get("origin");
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && !/\.vercel\.app$/.test(new URL(origin).hostname)) {
    return json(403, { error: "Forbidden" });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Send JSON" });
  }

  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200).split(/[?#]/)[0] : null;
  if (isExamPath(path)) return json(403, { error: "Retr0 Tutor is switched off during the final exam. Good luck!" });

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = raw
    .filter((m): m is Msg => !!m && typeof m === "object" && ((m as Msg).role === "user" || (m as Msg).role === "assistant") && typeof (m as Msg).content === "string")
    .slice(-TUTOR_LIMITS.maxHistory)
    .map((m) => ({ role: m.role, content: m.content.slice(0, m.role === "user" ? TUTOR_LIMITS.maxMessageChars : 3000) }));
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content.trim()) return json(400, { error: "Ask a question first." });
  if (typeof raw[raw.length - 1]?.content === "string" && raw[raw.length - 1].content.length > TUTOR_LIMITS.maxMessageChars) {
    return json(413, { error: `Keep questions under ${TUTOR_LIMITS.maxMessageChars} characters.` });
  }


  const t0 = Date.now();
  const ip = clientIp(request);
  const burst = await rateLimit(`tutor:${ip}`, 10, 2 * 60 * 1000);
  if (!burst.ok) return json(429, { error: `Slow down a little: try again in ${burst.retryAfterSec}s.` }, { "retry-after": String(burst.retryAfterSec) });
  const daily = await rateLimit(`tutor-day:${ip}`, 80, 24 * 60 * 60 * 1000);
  if (!daily.ok) return json(429, { error: "You've hit today's tutor limit. Come back tomorrow!" }, { "retry-after": String(daily.retryAfterSec) });
  const dayKey = `tutor-global:${new Date().toISOString().slice(0, 10)}`;
  const used = (await kvGet<number>(dayKey)) ?? 0;
  if (used >= DAILY_GLOBAL_CAP) return json(429, { error: "The tutor is resting for today. Try again tomorrow." });
  await kvSet(dayKey, used + 1, 26 * 60 * 60);


  const tLimit = Date.now() - t0;
  const pgRaw = body.playground && typeof body.playground === "object" ? (body.playground as Record<string, unknown>) : null;
  const playground = pgRaw
    ? {
        html: str(pgRaw.html, TUTOR_LIMITS.maxCodeChars),
        css: str(pgRaw.css, TUTOR_LIMITS.maxCodeChars),
        js: str(pgRaw.js, TUTOR_LIMITS.maxCodeChars),
        errors: str(pgRaw.errors, TUTOR_LIMITS.maxErrorChars),
      }
    : null;

  const prevUser = messages.filter((m) => m.role === "user").slice(-2, -1)[0]?.content ?? "";
  const query = `${last.content} ${prevUser.slice(0, 300)} ${playground?.errors ?? ""}`;
  const chunks = retrieve(query, path, 4);
  const here = lessonAt(path);
  const system = systemPrompt({ chunks, page: { path, title: here?.title ?? null, trackTitle: here?.trackTitle ?? null }, playground });

  const tRetrieve = Date.now() - t0;
  dbg("retrieved", chunks.length, system.length);
  let upstream: Response | null = null;
  let model = "";
  for (const m of MODELS) {
    try {
      const res = await fetch(`${NEAR_AI_URL}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        // Anthropic models think by default and that eats the output budget, so turn it off.
        body: JSON.stringify({ model: m, stream: true, max_tokens: TUTOR_LIMITS.maxOutputTokens, ...(m.startsWith("anthropic/") ? { thinking: { type: "disabled" } } : {}), messages: [{ role: "system", content: system }, ...messages] }),
        signal: AbortSignal.timeout(30000),
      });
      dbg("upstream", m, res.status);
      if (res.ok && res.body) {
        upstream = res;
        model = m;
        break;
      }
      console.warn(`tutor: ${m} -> ${res.status}`);
    } catch (error) {
      console.warn(`tutor: ${m} failed`, String(error).slice(0, 200));
    }
  }
  const tUpstream = Date.now() - t0;
  if (tUpstream > 8000) console.warn(`tutor slow: limit ${tLimit}ms retrieve ${tRetrieve}ms upstream ${tUpstream}ms`);
  if (!upstream?.body) return json(502, { error: "The tutor couldn't reach its brain. Try again in a moment." });

  const sources = chunks
    .filter((c, i, all) => all.findIndex((x) => x.href === c.href) === i)
    .map((c) => ({ href: c.href, title: c.lessonTitle, track: c.trackTitle }));
  // Chunk index -> lesson, so the client can turn [S2] into a link.
  const cite = chunks.map((c) => c.href);

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  let buffer = "";
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        let out = "";
        let finished = false;
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") {
            finished = true;
            continue;
          }
          try {
            const choice = JSON.parse(data)?.choices?.[0];
            const delta = choice?.delta?.content;
            if (typeof delta === "string") out += delta;
            if (choice?.finish_reason === "length") out += "…";
            if (choice?.finish_reason) finished = true;
          } catch {
            /* partial or keep-alive line */
          }
        }
        if (out) controller.enqueue(encoder.encode(out));
        if (finished) {
          controller.close();
          reader.cancel().catch(() => {});
        }
      } catch (error) {
        controller.enqueue(encoder.encode("\n\n_(connection dropped, ask again)_"));
        controller.close();
        console.warn("tutor stream", String(error).slice(0, 200));
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
      "x-tutor-model": model,
      "server-timing": `limit;dur=${tLimit}, retrieve;dur=${tRetrieve}, upstream;dur=${tUpstream}`,
      "x-tutor-sources": encodeURIComponent(JSON.stringify(sources)),
      "x-tutor-cite": encodeURIComponent(JSON.stringify(cite)),
      "x-ratelimit-remaining": String(Math.min(burst.remaining, daily.remaining)),
    },
  });
}
