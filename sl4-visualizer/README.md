# SL4 Yudkowsky × Goertzel Visualizer

A local browser for the [SL4 mailing list](http://sl4.org/) archive — specifically every thread on which **Eliezer Yudkowsky** or **Ben Goertzel** posted (2000–2012).

- **13,443 messages** across **1,377 threads**
- Yudkowsky: 1,968 messages · Goertzel: 2,107 · other authors in those threads: 9,368
- Client-side full-text search with [MiniSearch](https://github.com/lucaong/minisearch)
- Built with Next.js 14 (App Router) + Tailwind CSS

## Run locally

```bash
cd sl4-visualizer
npm install
npm run dev
# open http://localhost:3000
```

`public/messages.json`, `public/threads.json`, and `public/stats.json` are checked in, so the dev server works immediately.

## Rebuild the data

```bash
git clone --depth 1 https://github.com/weidai11/sl4.git /tmp/sl4
python3 scripts/parse.py /tmp/sl4 public/
```

The parser:
- walks `archive/YYMM/*.html` (Hypermail-formatted)
- extracts metadata from `<!-- key="value" -->` HTML comments
- strips body markup between `<!-- body="start" -->` and `<!-- body="end" -->`
- normalizes thread keys (`Re:` / `Fwd:` stripped, lowercased)
- filters to threads where Yudkowsky (`name` contains "yudkowsky" or starts with "eliezer") or Goertzel (`name` contains "goertzel") posted

## UI

- **Two-pane layout.** Left: thread list (date-sorted, newest first). Right: chronological message thread.
- **Author color coding.** Yudkowsky in blue, Goertzel in orange, others muted gray.
- **Search.** `/` to focus. Type to filter — matching messages list with snippets; click a hit to jump to the message in its thread (highlighted with a brief flash).
- **Keyboard.** `/` focus search · `j`/`k` or `↑`/`↓` navigate thread list · `Esc` clears or blurs search.
- **Deep linking.** Selected thread/message round-trip through `?thread=…&msg=…`.

## Notes on data scale

`messages.json` is ~36 MB. The search index is built once on first load and cached. If load time becomes a problem, split into per-year shards or omit `body` from the sidebar payload — see `parse.py` for the schema.
