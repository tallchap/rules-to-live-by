"use client";

import { useMemo } from "react";

interface Props {
  body: string;
  highlight?: string;
}

interface Block {
  type: "quote" | "text";
  text: string;
}

function splitBlocks(body: string): Block[] {
  const lines = body.split("\n");
  const out: Block[] = [];
  let buf: string[] = [];
  let mode: "quote" | "text" | null = null;
  const flush = () => {
    if (buf.length && mode) {
      out.push({ type: mode, text: buf.join("\n") });
      buf = [];
    }
  };
  const isQuote = (s: string) => /^\s*>+/.test(s);
  for (const line of lines) {
    const q = isQuote(line);
    const next: "quote" | "text" = q ? "quote" : "text";
    if (mode === null) mode = next;
    if (next !== mode) {
      flush();
      mode = next;
    }
    buf.push(line);
  }
  flush();
  return out;
}

function highlightText(text: string, terms: string[]) {
  if (!terms.length) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>,
  );
}

export default function MessageBody({ body, highlight }: Props) {
  const blocks = useMemo(() => splitBlocks(body), [body]);
  const terms = useMemo(() => {
    if (!highlight) return [] as string[];
    return highlight
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, ""))
      .filter((t) => t.length >= 2);
  }, [highlight]);

  return (
    <div className="text-[14px] leading-[1.65] text-text whitespace-pre-wrap break-words">
      {blocks.map((b, i) =>
        b.type === "quote" ? (
          <div key={i} className="quote">
            {highlightText(b.text, terms)}
          </div>
        ) : (
          <div key={i}>{highlightText(b.text, terms)}</div>
        ),
      )}
    </div>
  );
}
