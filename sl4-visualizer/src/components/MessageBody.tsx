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

function normalize(body: string): string {
  // Collapse runs of 2+ blank lines (common in Hypermail-decoded bodies) to one.
  const lines = body.split("\n");
  const out: string[] = [];
  let blanks = 0;
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, "");
    if (line.trim() === "") {
      blanks++;
      if (blanks <= 1) out.push("");
    } else {
      blanks = 0;
      out.push(line);
    }
  }
  return out.join("\n").trim();
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
    const next: "quote" | "text" = isQuote(line) ? "quote" : "text";
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
  const blocks = useMemo(() => splitBlocks(normalize(body)), [body]);
  const terms = useMemo(() => {
    if (!highlight) return [] as string[];
    return highlight
      .split(/\s+/)
      .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, ""))
      .filter((t) => t.length >= 2);
  }, [highlight]);

  return (
    <div className="text-[13.5px] leading-[1.55] text-text/90 whitespace-pre-wrap break-words font-sans space-y-2">
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
