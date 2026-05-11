"use client";

import { useEffect, useRef } from "react";
import type { Thread } from "@/lib/types";
import { formatMonth } from "@/lib/format";

interface Props {
  threads: Thread[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}

export default function ThreadList({ threads, selectedKey, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedKey]);

  return (
    <ul className="divide-y divide-border">
      {threads.map((t) => {
        const active = t.key === selectedKey;
        return (
          <li key={t.key}>
            <button
              ref={active ? activeRef : null}
              onClick={() => onSelect(t.key)}
              className={[
                "w-full text-left px-3 py-2.5 transition-colors",
                active
                  ? "bg-panel2 border-l-2 border-accent"
                  : "hover:bg-panel2 border-l-2 border-transparent",
              ].join(" ")}
              title={t.subject}
            >
              <div className="text-[11px] uppercase tracking-wider text-muted mb-0.5">
                {formatMonth(t.firstDate)}
              </div>
              <div className="text-sm text-text truncate font-medium leading-tight">
                {t.subject || "(no subject)"}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
                <span>{t.messageCount} msgs</span>
                {t.yudkowskyCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-yud" />
                    <span className="text-yud/90">{t.yudkowskyCount}</span>
                  </span>
                )}
                {t.goertzelCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-goe" />
                    <span className="text-goe/90">{t.goertzelCount}</span>
                  </span>
                )}
                {t.otherCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-other" />
                    <span>{t.otherCount}</span>
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
