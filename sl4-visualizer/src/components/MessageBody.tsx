"use client";

import { useMemo } from "react";

interface Props {
  body: string;
  highlight?: string;
}

type Para =
  | { kind: "text"; text: string }
  | { kind: "quote"; children: Para[] };

const QUOTE_RE = /^\s*>/;
const STRIP_QUOTE_RE = /^\s*>\s?/;
const LIST_RE = /^\s*(\d+[.)]|[-*•‣▪▫·])\s+\S/;
const SIG_RE = /^\s*--\s*$/;

function joinWrapped(lines: string[]): string {
  let out = "";
  for (const ln of lines) {
    if (out === "") {
      out = ln;
    } else if (/[A-Za-z0-9)\]]-$/.test(out)) {
      out += ln; // re-join a word split across the hard wrap (e.g. "human-\nequiv")
    } else {
      out += " " + ln;
    }
  }
  return out;
}

function reflow(lines: string[]): Para[] {
  const out: Para[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (QUOTE_RE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        inner.push(lines[i].replace(STRIP_QUOTE_RE, ""));
        i++;
      }
      out.push({ kind: "quote", children: reflow(inner) });
    } else {
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !QUOTE_RE.test(lines[i])
      ) {
        const t = lines[i].trim();
        // Start a fresh paragraph at list bullets or a signature delimiter.
        if (para.length > 0 && (LIST_RE.test(t) || SIG_RE.test(t))) break;
        para.push(t);
        i++;
        if (SIG_RE.test(t)) break;
      }
      out.push({ kind: "text", text: joinWrapped(para) });
    }
  }
  return out;
}

function markTerms(text: string, terms: string[]) {
  if (!terms.length) return text;
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  return text
    .split(re)
    .map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>));
}

function renderParas(paras: Para[], terms: string[], kp = ""): React.ReactNode {
  return paras.map((p, i) =>
    p.kind === "text" ? (
      <p key={kp + i}>{markTerms(p.text, terms)}</p>
    ) : (
      <blockquote key={kp + i} className="quote">
        {renderParas(p.children, terms, kp + i + ".")}
      </blockquote>
    ),
  );
}

export default function MessageBody({ body, highlight }: Props) {
  const paras = useMemo(() => reflow(body.split("\n")), [body]);
  const terms = useMemo(() => {
    if (!highlight) return [] as string[];
    return highlight
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, ""))
      .filter((t) => t.length >= 2);
  }, [highlight]);

  return (
    <div className="msg-body text-[14px] leading-[1.62] text-text/85 break-words">
      {renderParas(paras, terms)}
    </div>
  );
}
