"use client";

import { useEffect, useRef } from "react";
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

export default function ThreadView({
  thread,
  messages,
  highlightMessageId,
  highlightQuery,
  onBack,
}: Props) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0 });
    }
  }, [thread.key]);

  useEffect(() => {
    if (!highlightMessageId) return;
    const el = refs.current[highlightMessageId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }, [highlightMessageId, thread.key]);

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
      </header>

      <div className="px-3 sm:px-6 py-4 space-y-2.5 max-w-4xl">
        {messages.map((m) => (
          <article
            key={m.id}
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
        ))}
      </div>
    </div>
  );
}
