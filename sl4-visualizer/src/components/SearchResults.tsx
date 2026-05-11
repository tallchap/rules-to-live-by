"use client";

import type { Message } from "@/lib/types";
import { authorColorClass, authorDotClass, formatDay } from "@/lib/format";

interface Hit {
  message: Message;
  threadSubject: string;
  snippet: string;
  terms: string[];
}

interface Props {
  query: string;
  hits: Hit[];
  onSelect: (msg: Message) => void;
}

function HighlightedSnippet({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <span>{text}</span>;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}
    </>
  );
}

export default function SearchResults({ query, hits, onSelect }: Props) {
  if (!query.trim()) return null;
  return (
    <div>
      <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted border-b border-border">
        {hits.length} result{hits.length === 1 ? "" : "s"}
      </div>
      {hits.length === 0 ? (
        <div className="px-3 py-6 text-sm text-muted">No matches.</div>
      ) : (
        <ul className="divide-y divide-border">
          {hits.map(({ message, threadSubject, snippet, terms }) => (
            <li key={message.id}>
              <button
                onClick={() => onSelect(message)}
                className="w-full text-left px-3 py-2.5 hover:bg-panel2 transition-colors"
              >
                <div className="flex items-center gap-2 text-[11px] text-muted mb-1">
                  <span
                    className={["h-1.5 w-1.5 rounded-full", authorDotClass(message.authorKey)].join(
                      " ",
                    )}
                  />
                  <span className={authorColorClass(message.authorKey)}>{message.author}</span>
                  <span>· {formatDay(message.date)}</span>
                </div>
                <div className="text-[13px] text-text truncate font-medium">{threadSubject}</div>
                <div className="text-xs text-muted mt-1 line-clamp-2 leading-snug">
                  <HighlightedSnippet text={snippet} terms={terms} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
