"use client";

import { useEffect, useState } from "react";
import MiniSearch, { type SearchResult } from "minisearch";
import type { Message, Thread, Stats } from "./types";

export interface DataBundle {
  messages: Message[];
  threads: Thread[];
  stats: Stats;
  byId: Map<string, Message>;
  threadByKey: Map<string, Thread>;
  search: MiniSearch<Message>;
}

let cached: Promise<DataBundle> | null = null;

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

async function loadOnce(): Promise<DataBundle> {
  const [m, t, s] = await Promise.all([
    fetch(`${BASE}/messages.json`).then((r) => r.json() as Promise<Message[]>),
    fetch(`${BASE}/threads.json`).then((r) => r.json() as Promise<Thread[]>),
    fetch(`${BASE}/stats.json`).then((r) => r.json() as Promise<Stats>),
  ]);
  const byId = new Map<string, Message>();
  for (const msg of m) byId.set(msg.id, msg);
  const threadByKey = new Map<string, Thread>();
  for (const th of t) threadByKey.set(th.key, th);

  const search = new MiniSearch<Message>({
    idField: "id",
    fields: ["subject", "body", "author"],
    storeFields: ["id", "threadKey", "author", "authorKey", "subject", "date"],
    searchOptions: {
      boost: { subject: 2, author: 1.5 },
      prefix: true,
      combineWith: "AND",
    },
  });
  search.addAll(m);

  return { messages: m, threads: t, stats: s, byId, threadByKey, search };
}

export function loadData(): Promise<DataBundle> {
  if (!cached) cached = loadOnce();
  return cached;
}

export function useData() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadData()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, error };
}

export function runSearch(search: MiniSearch<Message>, q: string, limit = 60): SearchResult[] {
  if (!q.trim()) return [];
  return search.search(q, { fuzzy: 0.0 }).slice(0, limit);
}
