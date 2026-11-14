"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Award, Check, Clock, Lock, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNearWallet, type Attestation } from "@/components/near/wallet-provider";
import { runVisibleTests, type LocalResult } from "@/components/exam/test-runner";
import { EXAM, EXAM_PREREQS } from "@/lib/exam/config";
import { examStore, type StoredPass } from "@/lib/exam/client";
import { TOPIC_LABELS, type ExamPaper, type ExamResult, type ExamTopic } from "@/lib/exam/types";
import { useProgress } from "@/lib/progress";
import { explorerTx, verifyDiploma } from "@/lib/near";

const PREREQ_TITLES: Record<string, string> = {
  fundamentals: "Web3 Fundamentals quiz",
  contracts: "NEAR Smart Contracts quiz",
  tokens: "Tokens & NFTs on NEAR quiz",
  dapp: "Build a NEAR dApp quiz",
};
const PREREQ_MIN = 0.7;

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Bar({ value, max, good }: { value: number; max: number; good?: boolean }) {
  const pct = Math.round((value / Math.max(1, max)) * 100);
  return (
    <div className="h-3 w-full border-2 border-line bg-sunken" aria-hidden>
      <div className={good ?? pct >= 80 ? "h-full bg-good" : "h-full bg-accent"} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function FinalExam() {
  const progress = useProgress();
  const wallet = useNearWallet();
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [code, setCode] = useState<Record<string, string>>({});
  const [local, setLocal] = useState<Record<string, LocalResult[]>>({});
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<(ExamResult & { attestation?: Attestation | null }) | null>(null);
  const [pass, setPass] = useState<StoredPass | null>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mintTx, setMintTx] = useState<string | null>(null);
  const submitted = useRef(false);

  useEffect(() => {
    const a = examStore.attempt();
    if (a && a.paper.expiresAt + EXAM.graceMs > Date.now()) {
      setPaper(a.paper);
      setAnswers(a.answers);
      setCode(a.code);
    }
    setPass(examStore.pass());
    setCooldown(examStore.cooldown());
  }, []);

  useEffect(() => {
    if (paper) examStore.saveAttempt({ paper, answers, code });
  }, [paper, answers, code]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const prereqs = EXAM_PREREQS.map((track) => {
    const q = progress.quizzes[track];
    return { track, done: Boolean(q && q.total > 0 && q.correct / q.total >= PREREQ_MIN), score: q ? `${q.correct}/${q.total}` : null };
  });
  const prereqsDone = prereqs.every((p) => p.done);

  async function start(practice = false) {
    setError(null);
    setBusy(practice ? "Preparing a practice paper…" : "Preparing your exam…");
    try {
      const res = await fetch(practice ? "/api/exam/start?mode=practice" : "/api/exam/start", { method: "POST" });
      const data = await res.json();
      if (res.status === 429 && data.cooldownUntil) {
        examStore.saveCooldown(data.cooldownUntil);
        setCooldown(data.cooldownUntil);
        throw new Error("You are in a cooldown after a failed attempt.");
      }
      if (!res.ok) throw new Error(data.error || "Could not start the exam");
      const p = data as ExamPaper;
      submitted.current = false;
      setResult(null);
      setAnswers({});
      setLocal({});
      setCode(Object.fromEntries(p.tasks.map((t) => [t.id, t.starter])));
      setPaper(p);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const submit = useCallback(
    async (auto = false) => {
      if (!paper || submitted.current) return;
      if (!auto) {
        const unanswered = paper.questions.filter((q) => answers[q.id] === undefined).length;
        if (unanswered && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
      }
      submitted.current = true;
      setBusy("Grading on the server: checking answers and running hidden tests…");
      setError(null);
      try {
        const res = await fetch("/api/grade", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ track: "near", examToken: paper.token, answers, code, accountId: wallet.accountId ?? undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Grading failed");
        const r = data as ExamResult & { attestation?: Attestation | null };
        setResult(r);
        examStore.clearAttempt();
        setPaper(null);
        if (r.passToken) {
          const stored = { passToken: r.passToken, score: r.score, max: r.max_score, grade: r.grade ?? "B", at: Date.now() };
          examStore.savePass(stored);
          setPass(stored);
        }
        if (r.cooldownUntil) {
          examStore.saveCooldown(r.cooldownUntil);
          setCooldown(r.cooldownUntil);
        }
        window.scrollTo({ top: 0 });
      } catch (e) {
        submitted.current = false;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [paper, answers, code, wallet.accountId],
  );

  const remaining = paper ? paper.expiresAt - now : 0;
  useEffect(() => {
    if (paper && remaining <= 0 && !submitted.current) void submit(true);
  }, [paper, remaining, submit]);

  async function mint() {
    if (!pass || !wallet.accountId) return;
    setError(null);
    try {
      setBusy("Signing your attestation on the server…");
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ track: "near", passToken: pass.passToken, accountId: wallet.accountId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign attestation");
      setBusy("Waiting for your wallet…");
      const out = await wallet.mintDiploma(data.attestation as Attestation);
      if (out.txHash) setMintTx(out.txHash);
      setBusy("Reading your certificate from chain…");
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        if (await verifyDiploma(wallet.accountId)) break;
      }
      await wallet.refreshDiploma();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(m.includes("already holds") ? "This account already holds a NEAR Developer Certificate." : m);
    } finally {
      setBusy(null);
    }
  }

  const answeredCount = useMemo(() => (paper ? paper.questions.filter((q) => answers[q.id] !== undefined).length : 0), [paper, answers]);

  function renderCertificate() {
    const holds = wallet.diploma;
    return (
      <div className="border-2 border-accent bg-accent-soft p-5" data-testid="exam-certificate">
        <p className="flex items-center gap-2 font-pixel text-[0.7rem] uppercase text-highlight"><Award className="h-4 w-4" aria-hidden /> NEAR Developer Certificate</p>
        {holds ? (
          <p className="mt-3 text-sm text-ink">
            Minted to <strong>{holds.owner_id}</strong>: {holds.score}/{holds.max_score}.{" "}
            {mintTx ? <a className="text-info underline" href={explorerTx(mintTx)} target="_blank" rel="noopener">View transaction ↗</a> : null}{" "}
            <Link href="/diploma" className="text-info underline">Open your certificate</Link> ·{" "}
            <Link href="/advanced" className="text-info underline">Advanced NEAR →</Link>
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              Your pass ({pass?.score}/{pass?.max}, grade {pass?.grade}) is signed by the grader for 24 hours and can mint for one account. Connect a NEAR wallet and
              mint a soulbound NFT. The contract verifies the ed25519 attestation and records your score and grade on chain.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {!wallet.accountId ? (
                <Button type="button" onClick={wallet.connect}>Connect wallet</Button>
              ) : (
                <Button type="button" onClick={mint} disabled={Boolean(busy) || !wallet.holderChecked} data-testid="exam-mint">
                  {busy ?? `Mint to ${wallet.accountId}`}
                </Button>
              )}
            </div>
          </>
        )}
        {error ? <p role="alert" className="mt-3 break-words text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  // ---------- results ----------
  if (result) {
    return (
      <section className="mt-8 flex flex-col gap-6" data-testid="exam-result">
        <div className={`border-2 p-5 ${result.passed ? "border-good bg-good-soft" : "border-danger bg-danger-soft"}`}>
          <p className="font-pixel text-[0.65rem] uppercase tracking-wide text-ink">{result.passed ? "Passed" : "Not passed"}{result.practice ? " · practice paper" : ""}</p>
          <p className="mt-3 font-pixel text-title text-ink" data-testid="exam-score">
            {result.score}/{result.max_score} · {result.percent}%{result.grade ? ` · Grade ${result.grade}` : ""}
          </p>
          <p className="mt-2 text-sm text-muted">
            Pass mark {result.pass_score}/{result.max_score} ({EXAM.passPercent}%). Time used {mmss(result.durationSec * 1000)}.
            {result.cooldownUntil ? ` Next attempt after ${new Date(result.cooldownUntil).toLocaleTimeString()}.` : ""}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border-2 border-line bg-elevated p-5">
            <h2 className="font-pixel text-[0.7rem] uppercase text-highlight">Multiple choice · {result.mcq.correct}/{result.mcq.total}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {Object.entries(result.mcq.byTopic).map(([topic, s]) => (
                <li key={topic} className="text-sm">
                  <div className="mb-1 flex justify-between text-ink"><span>{TOPIC_LABELS[topic as ExamTopic] ?? topic}</span><span>{s.correct}/{s.total}</span></div>
                  <Bar value={s.correct} max={s.total} />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Per-question results and correct answers are not revealed: questions are reused across attempts.</p>
          </div>
          <div className="border-2 border-line bg-elevated p-5">
            <h2 className="font-pixel text-[0.7rem] uppercase text-highlight">Coding tasks · {result.tasks.reduce((s, t) => s + t.earned, 0)}/{result.tasks.reduce((s, t) => s + t.points, 0)}</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {result.tasks.map((t) => (
                <li key={t.id} className="text-sm">
                  <div className="mb-1 flex justify-between text-ink"><span>{t.title}</span><span>{t.earned}/{t.points}</span></div>
                  <Bar value={t.earned} max={t.points} />
                  <ul className="mt-2 flex flex-col gap-1">
                    {t.tests.map((x, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted">
                        {x.pass ? <Check className="h-3.5 w-3.5 shrink-0 text-good" aria-label="pass" /> : <X className="h-3.5 w-3.5 shrink-0 text-danger" aria-label="fail" />}
                        <span className="break-all">{x.name}{x.error ? ` · ${x.error}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {result.passed && !result.practice ? renderCertificate() : null}
        {result.practice ? (
          <p className="border-2 border-line bg-elevated p-4 text-sm text-ink" data-testid="exam-practice-done">
            That was the practice paper. The real final exam draws 25 questions from a 67-question bank, runs hidden tests and earns the
            NEAR Developer Certificate.{" "}
            <button type="button" className="text-info underline underline-offset-4" onClick={() => setResult(null)}>Back to the exam rules</button>
          </p>
        ) : null}
        {!result.passed && !result.practice ? (
          <p className="text-sm text-muted">
            Review the topics with low scores, then retake.{" "}
            <Link href="/fundamentals" className="text-info underline underline-offset-4">Back to the courses</Link>
          </p>
        ) : null}
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </section>
    );
  }

  // ---------- in progress ----------
  if (paper) {
    const low = remaining < 5 * 60 * 1000;
    return (
      <section className="mt-6" data-testid="exam-paper">
        <div className="sticky top-header z-20 -mx-5 flex flex-wrap items-center justify-between gap-3 border-y-2 border-line bg-canvas/95 px-5 py-3 backdrop-blur md:mx-0 md:border-2">
          <span className={`inline-flex items-center gap-2 font-pixel text-[0.7rem] ${low ? "text-danger" : "text-highlight"}`} data-testid="exam-timer">
            <Clock className="h-4 w-4" aria-hidden /> {mmss(remaining)}
          </span>
          <span className="text-sm text-muted">{answeredCount}/{paper.questions.length} answered · 3 tasks</span>
          <Button type="button" onClick={() => submit(false)} disabled={Boolean(busy)} data-testid="exam-submit">
            {busy ? "Grading…" : "Submit exam"}
          </Button>
        </div>
        {paper.practice ? <p className="mt-4 border-2 border-line bg-elevated p-3 text-sm text-warn" data-testid="exam-practice-note">Practice paper: 5 public questions and the 3 coding tasks with visible tests only. Graded on the server exactly like the real exam, but it cannot earn a certificate.</p> : null}
        <h2 className="mt-8 font-pixel text-[0.75rem] uppercase text-highlight">Part 1 · Multiple choice ({paper.questions.length} points)</h2>
        <ol className="mt-4 flex flex-col gap-5">
          {paper.questions.map((q, i) => (
            <li key={q.id} className="border-2 border-line bg-elevated p-4 md:p-5">
              <fieldset>
                <legend className="text-ink">
                  <span className="mr-2 font-pixel text-[0.6rem] text-muted">Q{i + 1} · {TOPIC_LABELS[q.topic]}</span>
                  <span className="mt-1 block font-medium">{q.question}</span>
                </legend>
                {q.code ? (
                  <pre className="mt-3 overflow-x-auto border-2 border-line bg-code p-3 font-mono text-[0.8rem] leading-relaxed text-code-fg"><code>{q.code}</code></pre>
                ) : null}
                <div className="mt-3 flex flex-col gap-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className={`flex cursor-pointer items-start gap-3 border-2 px-3 py-2 text-sm ${answers[q.id] === oi ? "border-accent bg-accent-soft text-ink" : "border-line text-ink hover:border-cyan"}`}>
                      <input type="radio" className="mt-1 accent-[var(--w3h-accent)]" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                      <span className="break-words">{opt}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
        <h2 className="mt-10 font-pixel text-[0.75rem] uppercase text-highlight">Part 2 · Coding tasks ({paper.tasks.reduce((s, t) => s + t.points, 0)} points)</h2>
        <p className="mt-2 text-sm text-muted">Each task is graded on the server by visible and hidden tests in a sandbox. Partial credit per passing test.</p>
        <ol className="mt-4 flex flex-col gap-6">
          {paper.tasks.map((t, i) => (
            <li key={t.id} className="border-2 border-line bg-elevated p-4 md:p-5">
              <p className="font-pixel text-[0.6rem] text-muted">Task {i + 1} · {t.points} points · {t.visibleTests.length} visible + {t.hiddenCount} hidden tests</p>
              <h3 className="mt-2 font-semibold text-ink">{t.title}</h3>
              <p className="mt-2 text-sm text-muted">{t.prompt}</p>
              <textarea
                aria-label={`Code for ${t.title}`}
                spellCheck={false}
                value={code[t.id] ?? ""}
                onChange={(e) => setCode((c) => ({ ...c, [t.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const { selectionStart: s, selectionEnd: en, value } = el;
                    const next = value.slice(0, s) + "  " + value.slice(en);
                    setCode((c) => ({ ...c, [t.id]: next }));
                    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
                  }
                }}
                className="mt-3 h-56 w-full resize-y border-2 border-line bg-code p-3 font-mono text-[0.8rem] leading-relaxed text-code-fg focus:border-accent focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => void runVisibleTests(code[t.id] ?? "", t.fn, t.visibleTests).then((r) => setLocal((l) => ({ ...l, [t.id]: r })))}>
                  <Play className="h-4 w-4" aria-hidden /> Run visible tests
                </Button>
                <span className="text-xs text-muted">Runs in your browser. Hidden tests run only on submit.</span>
              </div>
              {local[t.id]?.length ? (
                <ul className="mt-3 flex flex-col gap-1 text-xs">
                  {local[t.id].map((r, k) => (
                    <li key={k} className={r.pass ? "text-good" : "text-danger"}>{r.pass ? "✓" : "✗"} {r.name}: {r.detail}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => submit(false)} disabled={Boolean(busy)}>{busy ?? "Submit exam"}</Button>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        </div>
      </section>
    );
  }

  // ---------- intro / gate ----------
  const coolingDown = cooldown && cooldown > now;
  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]" data-testid="exam-intro">
      <div className="border-2 border-line bg-elevated p-5">
        <h2 className="font-pixel text-[0.7rem] uppercase text-highlight">Rules</h2>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-ink">
          <li><strong>25 questions</strong> drawn at random from a bank of 60+ (5 per area: fundamentals, contracts, tokens, dApps, advanced). Code-reading, predict-the-output and debugging. Options are shuffled every attempt.</li>
          <li><strong>3 coding tasks</strong> in JavaScript, graded on the server by visible and hidden tests in a sandbox (15 points).</li>
          <li><strong>{EXAM.durationMs / 60000} minutes.</strong> The timer is enforced by the server; the exam auto-submits at 0.</li>
          <li>Pass mark <strong>{EXAM.passScore}/{EXAM.maxScore} ({EXAM.passPercent}%)</strong>. Grade A+ ≥ 95%, A ≥ 90%, B ≥ 80%, written into your NFT.</li>
          <li><strong>{EXAM.cooldownMs / 60000}-minute cooldown</strong> after a failed attempt.</li>
          <li>The answer key and hidden tests never reach your browser.</li>
        </ul>
      </div>
      <div className="flex flex-col gap-4">
        <div className="border-2 border-line bg-elevated p-5">
          <h2 className="font-pixel text-[0.7rem] uppercase text-highlight">Unlock: core NEAR courses</h2>
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {prereqs.map((p) => (
              <li key={p.track} className="flex items-center justify-between gap-2">
                <Link href={`/${p.track}/quiz`} className="text-info underline underline-offset-4">{PREREQ_TITLES[p.track]}</Link>
                <span className={p.done ? "text-good" : "text-muted"}>{p.done ? `✓ ${p.score}` : p.score ? `${p.score} (need 70%)` : "not taken"}</span>
              </li>
            ))}
          </ul>
        </div>
        {pass ? (
          <p className="border-2 border-good bg-good-soft p-4 text-sm text-ink">
            You passed: {pass.score}/{pass.max}, grade {pass.grade}. <Link href="/diploma" className="text-info underline">Mint your certificate →</Link>
          </p>
        ) : null}
        <Button type="button" className="h-12" onClick={() => start(false)} disabled={!prereqsDone || Boolean(coolingDown) || Boolean(busy)} data-testid="exam-start">
          {!prereqsDone ? <><Lock className="h-4 w-4" aria-hidden /> Finish the 4 course quizzes to unlock</> : coolingDown ? `Cooldown · ${mmss(cooldown - now)}` : busy ?? "Start the final exam"}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => start(true)} disabled={Boolean(busy)} data-testid="exam-practice">
          Try a practice paper (no wallet, no prerequisites)
        </Button>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      </div>
    </section>
  );
}
