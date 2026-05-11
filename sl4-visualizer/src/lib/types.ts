export type AuthorKey = "yudkowsky" | "goertzel" | "other";

export interface Message {
  id: string;
  messageId: string;
  author: string;
  authorKey: AuthorKey;
  email: string;
  subject: string;
  threadKey: string;
  date: string | null;
  inReplyTo: string;
  body: string;
  url: string;
}

export interface Thread {
  key: string;
  subject: string;
  messageCount: number;
  yudkowskyCount: number;
  goertzelCount: number;
  otherCount: number;
  firstDate: string | null;
  lastDate: string | null;
  messageIds: string[];
}

export interface Stats {
  yudkowskyMessages: number;
  goertzelMessages: number;
  otherMessages: number;
  totalMessages: number;
  totalThreads: number;
}
