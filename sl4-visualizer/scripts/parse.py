#!/usr/bin/env python3
"""
Parse the SL4 Hypermail HTML archive into JSON.

Reads `<archive_root>/archive/YYMM/*.html` and writes:
  messages.json - all messages in scope (threads where Yudkowsky or Goertzel posted)
  threads.json  - thread summaries for those messages

Usage: parse.py <archive_root> <output_dir>
"""
import os
import re
import sys
import json
import html
from datetime import datetime, timezone
from collections import defaultdict

META_RE = re.compile(r'<!--\s*([a-z]+)="([^"]*)"\s*-->')
BODY_START = '<!-- body="start" -->'
BODY_END = '<!-- body="end" -->'
TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'[ \t]+')


def author_key(name: str) -> str:
    if not name:
        return "other"
    n = name.lower()
    if "yudkowsky" in n or n.startswith("eliezer"):
        return "yudkowsky"
    if "goertzel" in n:
        return "goertzel"
    return "other"


def normalize_thread(subject: str) -> str:
    s = subject or ""
    # strip leading Re:/Fwd:/RE:/FW: prefixes repeatedly
    while True:
        new = re.sub(r'^\s*(re|fwd|fw|aw)\s*:\s*', '', s, count=1, flags=re.IGNORECASE)
        if new == s:
            break
        s = new
    return s.lower().strip()


def parse_iso(s: str):
    # Hypermail isosent looks like 20020622102627
    if not s or len(s) < 8:
        return None
    try:
        y = int(s[0:4]); m = int(s[4:6]); d = int(s[6:8])
        hh = int(s[8:10]) if len(s) >= 10 else 0
        mm = int(s[10:12]) if len(s) >= 12 else 0
        ss = int(s[12:14]) if len(s) >= 14 else 0
        return datetime(y, m, d, hh, mm, ss, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    except (ValueError, TypeError):
        return None


def extract_body(text: str) -> str:
    a = text.find(BODY_START)
    b = text.find(BODY_END)
    if a == -1 or b == -1:
        return ""
    raw = text[a + len(BODY_START):b]
    # Decode quoted-reply `<em> &gt; ...</em>` blocks by stripping em tags
    # but keep the `&gt;` markers (will become `>` after entity decode).
    # Replace <br> with newline.
    raw = re.sub(r'<\s*br\s*/?>', '\n', raw, flags=re.IGNORECASE)
    raw = re.sub(r'</\s*p\s*>', '\n\n', raw, flags=re.IGNORECASE)
    raw = TAG_RE.sub('', raw)
    raw = html.unescape(raw)
    # Normalize whitespace: collapse runs of spaces/tabs but preserve newlines
    lines = []
    for line in raw.splitlines():
        line = WS_RE.sub(' ', line).rstrip()
        # Hypermail wraps quoted lines like " > text" - normalize leading space before >
        lines.append(line)
    # collapse 3+ blank lines into 2
    cleaned = []
    blank = 0
    for ln in lines:
        if not ln.strip():
            blank += 1
            if blank <= 2:
                cleaned.append("")
        else:
            blank = 0
            cleaned.append(ln)
    return "\n".join(cleaned).strip()


def parse_file(path: str, rel_id: str, url_base: str):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    meta = {}
    for m in META_RE.finditer(text[: min(len(text), 8000)]):
        k, v = m.group(1), m.group(2)
        if k not in meta:
            meta[k] = html.unescape(v)
    name = meta.get('name', '').strip()
    subject = meta.get('subject', '').strip()
    msg_id = meta.get('id', '').strip()
    isosent = meta.get('isosent', '').strip()
    email = meta.get('email', '').strip()
    inreplyto = meta.get('inreplyto', '').strip()
    body = extract_body(text)
    date = parse_iso(isosent)
    return {
        "id": rel_id,
        "messageId": msg_id,
        "author": name,
        "authorKey": author_key(name),
        "email": email,
        "subject": subject,
        "threadKey": normalize_thread(subject),
        "date": date,
        "inReplyTo": inreplyto,
        "body": body,
        "url": f"{url_base}/{rel_id}.html",
    }


def main():
    if len(sys.argv) < 3:
        print("Usage: parse.py <archive_root> <output_dir>", file=sys.stderr)
        sys.exit(1)
    archive_root = sys.argv[1]
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    url_base = "http://sl4.org/archive"

    archive_dir = os.path.join(archive_root, "archive")
    if not os.path.isdir(archive_dir):
        print(f"No archive directory at {archive_dir}", file=sys.stderr)
        sys.exit(1)

    all_messages = []
    n_files = 0
    n_parsed = 0
    for month in sorted(os.listdir(archive_dir)):
        month_dir = os.path.join(archive_dir, month)
        if not os.path.isdir(month_dir) or not re.fullmatch(r'\d{4}', month):
            continue
        for fn in sorted(os.listdir(month_dir)):
            if not fn.endswith('.html'):
                continue
            base = fn[:-5]
            if not base.isdigit():
                continue
            n_files += 1
            path = os.path.join(month_dir, fn)
            rel_id = f"{month}/{base}"
            try:
                msg = parse_file(path, rel_id, url_base)
            except Exception as e:
                print(f"  ! failed {rel_id}: {e}", file=sys.stderr)
                continue
            if not msg.get("messageId") and not msg.get("subject"):
                continue
            all_messages.append(msg)
            n_parsed += 1
        if n_files % 2000 < 50:
            print(f"  parsed {n_parsed} / scanned {n_files} ({month})", file=sys.stderr)

    print(f"Total parsed: {n_parsed}", file=sys.stderr)

    # Build threads
    threads = defaultdict(list)
    for m in all_messages:
        threads[m["threadKey"]].append(m)

    in_scope_keys = set()
    for key, msgs in threads.items():
        if any(m["authorKey"] in ("yudkowsky", "goertzel") for m in msgs):
            in_scope_keys.add(key)

    print(f"Total threads: {len(threads)}; in-scope threads: {len(in_scope_keys)}", file=sys.stderr)

    in_scope_messages = [m for m in all_messages if m["threadKey"] in in_scope_keys]
    in_scope_messages.sort(key=lambda m: (m["date"] or "", m["id"]))
    print(f"In-scope messages: {len(in_scope_messages)}", file=sys.stderr)

    # Build thread summaries
    thread_objs = []
    for key in in_scope_keys:
        msgs = sorted(threads[key], key=lambda m: (m["date"] or "", m["id"]))
        if not msgs:
            continue
        # Pick a representative subject: prefer the earliest non-Re: subject, else first
        canonical_subject = None
        for m in msgs:
            s = m["subject"] or ""
            if not re.match(r'^\s*(re|fwd|fw|aw)\s*:', s, re.IGNORECASE):
                canonical_subject = s
                break
        if not canonical_subject:
            canonical_subject = msgs[0]["subject"] or key
        y = sum(1 for m in msgs if m["authorKey"] == "yudkowsky")
        g = sum(1 for m in msgs if m["authorKey"] == "goertzel")
        o = sum(1 for m in msgs if m["authorKey"] == "other")
        thread_objs.append({
            "key": key,
            "subject": canonical_subject.strip(),
            "messageCount": len(msgs),
            "yudkowskyCount": y,
            "goertzelCount": g,
            "otherCount": o,
            "firstDate": msgs[0]["date"],
            "lastDate": msgs[-1]["date"],
            "messageIds": [m["id"] for m in msgs],
        })
    thread_objs.sort(key=lambda t: (t["firstDate"] or ""), reverse=True)

    counts = {
        "yudkowskyMessages": sum(1 for m in in_scope_messages if m["authorKey"] == "yudkowsky"),
        "goertzelMessages": sum(1 for m in in_scope_messages if m["authorKey"] == "goertzel"),
        "otherMessages": sum(1 for m in in_scope_messages if m["authorKey"] == "other"),
        "totalMessages": len(in_scope_messages),
        "totalThreads": len(thread_objs),
    }
    print(json.dumps(counts, indent=2), file=sys.stderr)

    msgs_path = os.path.join(out_dir, "messages.json")
    thr_path = os.path.join(out_dir, "threads.json")
    stats_path = os.path.join(out_dir, "stats.json")
    with open(msgs_path, 'w', encoding='utf-8') as f:
        json.dump(in_scope_messages, f, ensure_ascii=False, separators=(',', ':'))
    with open(thr_path, 'w', encoding='utf-8') as f:
        json.dump(thread_objs, f, ensure_ascii=False, separators=(',', ':'))
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(counts, f, ensure_ascii=False, indent=2)
    print(f"Wrote {msgs_path}, {thr_path}, {stats_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
