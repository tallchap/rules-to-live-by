"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Message, Thread } from "@/lib/types";
import {
  authorBorderClass,
  authorColorClass,
  authorDotClass,
  formatFull,
  formatRange,
} from "@/lib/format";
import MessageBody from "./MessageBody";

interface Props {
  thread: Thread;
  messages: Message[];
  highlightMessageId: string | null;
  highlightQuery: string | null;
  onBack: () => void;
}

const MAX_INDENT_LEVEL = 9;
const INDENT_PX = 16;

const byDate = (a: Message, b: Message) =>
  (a.date || "").localeCompare(b.date || "") || a.id.localeCompare(b.id);

function buildOrder(messages: Message[]): { msg: Message; depth: number }[] {
  const byMessageId = new Map<string, Message>();
  for (const m of messages) if (m.messageId) byMessageId.set(m.messageId, m);

  const childrenOf = new Map<string, Message[]>();
  const roots: Message[] = [];
  for (const m of messages) {
    const parent = m.inReplyTo ? byMessageId.get(m.inReplyTo) : undefined;
    if (parent && parent.id !== m.id) {
      const arr = childrenOf.get(parent.id);
      if (arr) arr.push(m);
      else childrenOf.set(parent.id, [m]);
    } else {
      roots.push(m);
    }
  }
  roots.sort(byDate);
  for (const arr of childrenOf.values()) arr.sort(byDate);

  const ordered: { msg: Message; depth: number }[] = [];
  const seen = new Set<string>();
  const stack: { msg: Message; depth: number }[] = [];
  for (let i = roots.length - 1; i >= 0; i--) stack.push({ msg: roots[i], depth: 0 });
  while (stack.length) {
    const { msg, depth } = stack.pop()!;
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    ordered.push({ msg, depth });
    const kids = childrenOf.get(msg.id);
    if (kids) for (let i = kids.length - 1; i >= 0; i--) stack.push({ msg: kids[i], depth: depth + 1 });
  }
  // Safety: append any messages not reached (e.g. reply cycles).
  for (const m of messages) if (!seen.has(m.id)) ordered.push({ msg: m, depth: 0 });
  return ordered;
}

export default function ThreadView({
  thread,
  messages,
  highlightMessageId,
  highlightQuery,
  onBack,
}: Props) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [treeMode, setTreeMode] = useState(true);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTo({ top: 0 });
  }, [thread.key]);

  useEffect(() => {
    if (!highlightMessageId) return;
    const el = refs.current[highlightMessageId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }, [highlightMessageId, thread.key, treeMode]);

  const order = useMemo(
    () => (treeMode ? buildOrder(messages) : messages.map((msg) => ({ msg, depth: 0 }))),
    [messages, treeMode],
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-start gap-3">
        <button
          onClick={onBack}
          className="md:hidden -ml-1 mt-0.5 px-2 py-1 rounded text-muted hover:text-text hover:bg-panel2"
          aria-label="Back to thread list"
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-semibold text-text leading-tight">
            {thread.subject || "(no subject)"}
          </h1>
          <div className="mt-1 text-[11px] sm:text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{formatRange(thread.firstDate, thread.lastDate)}</span>
            <span aria-hidden>·</span>
            <span>{thread.messageCount} messages</span>
            {thread.yudkowskyCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-yud" />
                <span className="text-yud/90">{thread.yudkowskyCount} Yudkowsky</span>
              </span>
            )}
            {thread.goertzelCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-goe" />
                <span className="text-goe/90">{thread.goertzelCount} Goertzel</span>
              </span>
            )}
            {thread.otherCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-other" />
                <span>{thread.otherCount} other</span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setTreeMode((v) => !v)}
          className="shrink-0 self-start text-[11px] px-2 py-1 rounded-md border border-border text-muted hover:text-text hover:border-border/80 transition-colors"
          title={treeMode ? "Switch to flat chronological order" : "Switch to reply-tree order"}
        >
          {treeMode ? "⤷ Tree" : "≡ Flat"}
        </button>
      </header>

      <div className="px-3 sm:px-6 py-4 max-w-4xl">
        {order.map(({ msg: m, depth }) => {
          const indent = Math.min(depth, MAX_INDENT_LEVEL) * INDENT_PX;
          return (
            <div
              key={m.id}
              style={depth > 0 ? { marginLeft: indent } : undefined}
              className={[
                "mt-2.5 first:mt-0",
                depth > 0 ? "border-l border-border/70 pl-2.5 sm:pl-3" : "",
              ].join(" ")}
            >
              <article
                ref={(el) => {
                  refs.current[m.id] = el;
                }}
                className={[
                  "rounded-md border bg-panel transition-colors",
                  authorBorderClass(m.authorKey),
                ].join(" ")}
              >
                <div className="flex items-baseline justify-between gap-3 px-3 sm:px-4 pt-2.5 pb-1.5 border-b border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={["h-2 w-2 rounded-full shrink-0", authorDotClass(m.authorKey)].join(
                        " ",
                      )}
                    />
                    <span
                      className={[
                        "text-sm font-medium truncate",
                        authorColorClass(m.authorKey),
                      ].join(" ")}
                    >
                      {m.author || "(unknown)"}
                    </span>
                    <span className="text-xs text-muted truncate hidden sm:inline">
                      {m.subject && m.subject !== thread.subject ? `· ${m.subject}` : null}
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted shrink-0 flex items-center gap-2">
                    <time>{formatFull(m.date)}</time>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-accent"
                      title="Open original on sl4.org"
                    >
                      ↗
                    </a>
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2.5">
                  <MessageBody body={m.body} highlight={highlightQuery || undefined} />
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}
