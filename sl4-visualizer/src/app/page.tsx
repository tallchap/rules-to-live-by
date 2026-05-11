"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData, runSearch } from "@/lib/data";
import type { Message } from "@/lib/types";
import SearchBox from "@/components/SearchBox";
import SearchResults from "@/components/SearchResults";
import ThreadList from "@/components/ThreadList";
import ThreadView from "@/components/ThreadView";

function App() {
  const { data, error } = useData();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Read URL state on mount and when popstate fires
  useEffect(() => {
    const sync = () => {
      const url = new URL(window.location.href);
      const t = url.searchParams.get("thread");
      const m = url.searchParams.get("msg");
      const q = url.searchParams.get("q");
      setSelectedThread(t);
      setSelectedMessage(m);
      if (q !== null) setQuery(q);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Write URL state on selection change
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedThread) url.searchParams.set("thread", selectedThread);
    else url.searchParams.delete("thread");
    if (selectedMessage) url.searchParams.set("msg", selectedMessage);
    else url.searchParams.delete("msg");
    window.history.replaceState({}, "", url.toString());
  }, [selectedThread, selectedMessage]);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const inField = tag === "input" || tag === "textarea";
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && inField) {
        if (query) {
          setQuery("");
        } else {
          (e.target as HTMLElement).blur();
        }
        return;
      }
      if (!data || inField) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        navigateThread(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        navigateThread(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, selectedThread, query]);

  const navigateThread = useCallback(
    (delta: number) => {
      if (!data) return;
      const list = data.threads;
      const idx = list.findIndex((t) => t.key === selectedThread);
      const nextIdx = Math.max(0, Math.min(list.length - 1, (idx === -1 ? 0 : idx + delta)));
      const next = list[nextIdx];
      if (next) {
        setSelectedThread(next.key);
        setSelectedMessage(null);
      }
    },
    [data, selectedThread],
  );

  const hits = useMemo(() => {
    if (!data || !debounced) return [] as ReturnType<typeof buildHits>;
    const results = runSearch(data.search, debounced, 80);
    return buildHits(results, data.byId, data.threadByKey, debounced);
  }, [data, debounced]);

  const onSelectThread = useCallback((key: string) => {
    setSelectedThread(key);
    setSelectedMessage(null);
    setHighlightQuery(null);
  }, []);

  const onSelectSearchResult = useCallback(
    (msg: Message) => {
      setSelectedThread(msg.threadKey);
      setSelectedMessage(msg.id);
      setHighlightQuery(debounced);
    },
    [debounced],
  );

  const activeThread = useMemo(() => {
    if (!data || !selectedThread) return null;
    return data.threadByKey.get(selectedThread) || null;
  }, [data, selectedThread]);

  const activeMessages = useMemo(() => {
    if (!data || !activeThread) return [];
    return activeThread.messageIds
      .map((id) => data.byId.get(id))
      .filter((m): m is Message => Boolean(m));
  }, [data, activeThread]);

  if (error) {
    return (
      <div className="h-screen w-screen grid place-items-center text-sm text-muted">
        Failed to load data: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen w-screen grid place-items-center text-sm text-muted">
        Loading 13,443 messages…
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid grid-cols-[360px_1fr] bg-bg">
      <aside className="border-r border-border flex flex-col min-h-0">
        <div className="px-3 py-3 border-b border-border space-y-2 bg-bg">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text">SL4 Archive</h2>
              <p className="text-[11px] text-muted leading-tight mt-0.5">
                <span className="text-yud">Yudkowsky</span> ×{" "}
                <span className="text-goe">Goertzel</span> · {data.stats.totalThreads} threads ·{" "}
                {data.stats.totalMessages.toLocaleString()} messages
              </p>
            </div>
          </div>
          <SearchBox
            ref={searchInputRef}
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {debounced ? (
            <SearchResults
              query={debounced}
              hits={hits}
              onSelect={onSelectSearchResult}
            />
          ) : (
            <ThreadList
              threads={data.threads}
              selectedKey={selectedThread}
              onSelect={onSelectThread}
            />
          )}
        </div>
      </aside>

      <main className="min-h-0">
        {activeThread ? (
          <ThreadView
            thread={activeThread}
            messages={activeMessages}
            highlightMessageId={selectedMessage}
            highlightQuery={highlightQuery}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full grid place-items-center text-center px-8">
      <div className="max-w-md">
        <div className="text-xs uppercase tracking-widest text-muted mb-2">SL4 Mailing List</div>
        <h1 className="text-2xl font-semibold text-text mb-3">
          <span className="text-yud">Yudkowsky</span> × <span className="text-goe">Goertzel</span>
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          1,377 threads — every conversation on the SL4 list (2000–2012) where either Eliezer
          Yudkowsky or Ben Goertzel posted. Hard takeoff, Friendly AI, Bayesian reasoning, AGI
          architecture.
        </p>
        <p className="text-xs text-muted mt-4">
          Select a thread on the left, or press <kbd className="px-1.5 py-0.5 bg-panel2 border border-border rounded text-text">/</kbd> to search.
        </p>
      </div>
    </div>
  );
}

function buildHits(
  results: ReturnType<typeof runSearch>,
  byId: Map<string, Message>,
  threadByKey: Map<string, import("@/lib/types").Thread>,
  query: string,
) {
  const terms = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, ""))
    .filter((t) => t.length >= 2);
  return results
    .map((r) => {
      const msg = byId.get(r.id as string);
      if (!msg) return null;
      const thread = threadByKey.get(msg.threadKey);
      return {
        message: msg,
        threadSubject: thread?.subject || msg.subject || "(no subject)",
        snippet: makeSnippet(msg.body, terms),
        terms,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

function makeSnippet(body: string, terms: string[]) {
  if (!terms.length) return body.slice(0, 220);
  const lower = body.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  if (pos === -1) return body.slice(0, 220);
  const start = Math.max(0, pos - 80);
  const end = Math.min(body.length, pos + 180);
  const prefix = start > 0 ? "… " : "";
  const suffix = end < body.length ? " …" : "";
  return prefix + body.slice(start, end).replace(/\s+/g, " ").trim() + suffix;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
