"use client";

import { useEffect, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import type { Message, Thread, Stats } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export interface DataBundle {
  threads: Thread[];
  stats: Stats;
  threadByKey: Map<string, Thread>;
  messages: Message[] | null;
  byId: Map<string, Message> | null;
  search: MiniSearch<Message> | null;
  status: "loading-meta" | "loading-bodies" | "ready";
  searchStatus: "idle" | "indexing" | "ready";
}

type Listener = (b: DataBundle) => void;

let current: DataBundle | null = null;
let messagesPromise: Promise<Message[]> | null = null;
let indexPromise: Promise<MiniSearch<Message>> | null = null;
const listeners = new Set<Listener>();

function emit(next: DataBundle) {
  current = next;
  for (const l of listeners) l(next);
}

async function fetchMessages(): Promise<Message[]> {
  const r = await fetch(`${BASE}/messages.json`);
  return (await r.json()) as Message[];
}

async function loadMeta(): Promise<DataBundle> {
  const [t, s] = await Promise.all([
    fetch(`${BASE}/threads.json`).then((r) => r.json() as Promise<Thread[]>),
    fetch(`${BASE}/stats.json`).then((r) => r.json() as Promise<Stats>),
  ]);
  const threadByKey = new Map<string, Thread>();
  for (const th of t) threadByKey.set(th.key, th);
  return {
    threads: t,
    stats: s,
    threadByKey,
    messages: null,
    byId: null,
    search: null,
    status: "loading-bodies",
    searchStatus: "idle",
  };
}

function ensureBodiesLoading() {
  if (!current || current.messages) return;
  if (!messagesPromise) {
    messagesPromise = fetchMessages();
    messagesPromise.then((msgs) => {
      if (!current) return;
      const byId = new Map<string, Message>();
      for (const m of msgs) byId.set(m.id, m);
      emit({ ...current, messages: msgs, byId, status: "ready" });
    });
  }
}

export function ensureSearchIndex() {
  if (!current) return;
  if (current.search) return;
  if (current.searchStatus === "indexing") return;
  // Wait for messages to be ready first
  ensureBodiesLoading();
  if (!messagesPromise) return;
  emit({ ...current, searchStatus: "indexing" });
  indexPromise = messagesPromise.then(async (msgs) => {
    const ms = new MiniSearch<Message>({
      idField: "id",
      fields: ["subject", "body", "author"],
      storeFields: ["id", "threadKey", "author", "authorKey", "subject", "date"],
      searchOptions: {
        boost: { subject: 2, author: 1.5 },
        prefix: true,
        combineWith: "AND",
      },
    });
    // Add in chunks so we don't block forever
    const chunk = 1000;
    for (let i = 0; i < msgs.length; i += chunk) {
      ms.addAll(msgs.slice(i, i + chunk));
      // yield to the browser
      await new Promise((r) => setTimeout(r, 0));
    }
    return ms;
  });
  indexPromise.then((ms) => {
    if (!current) return;
    emit({ ...current, search: ms, searchStatus: "ready" });
  });
}

let bootstrapPromise: Promise<void> | null = null;

function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const meta = await loadMeta();
    emit(meta);
    // Eagerly start fetching bodies after meta is rendered.
    ensureBodiesLoading();
  })();
  return bootstrapPromise;
}

export function useData() {
  const [bundle, setBundle] = useState<DataBundle | null>(current);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    const onChange: Listener = (b) => {
      if (!cancelled) setBundle(b);
    };
    listeners.add(onChange);
    if (current) setBundle(current);
    bootstrap().catch((e) => {
      if (!cancelled) setError(e);
    });
    return () => {
      cancelled = true;
      listeners.delete(onChange);
    };
  }, []);
  return { data: bundle, error };
}

export function runSearch(search: MiniSearch<Message>, q: string, limit = 60): SearchResult[] {
  if (!q.trim()) return [];
  return search.search(q, { fuzzy: 0.0 }).slice(0, limit);
}
