"use client";
import React from "react";

// Auto-parse URLs and short tags in text
// Short tags: #matter:123 → link to matter, #case:xyz → link to case, @user → mention
const URL_RE = /https?:\/\/[^\s<]+/g;
const TAG_RE = /#(matter|case|doc|job):([a-zA-Z0-9_-]+)/g;
const MENTION_RE = /@([a-zA-Z0-9_]+)/g;

interface Token {
  type: "text" | "url" | "tag" | "mention";
  value: string;
  tag?: string;
  id?: string;
}

function tokenize(text: string): Token[] {
  const combined = new RegExp(`(${URL_RE.source})|(${TAG_RE.source})|(${MENTION_RE.source})`, "g");
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(combined)) {
    if (match.index! > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index!) });
    }
    if (match[1]) {
      tokens.push({ type: "url", value: match[1] });
    } else if (match[2]) {
      tokens.push({ type: "tag", value: match[2], tag: match[3], id: match[4] });
    } else if (match[5]) {
      tokens.push({ type: "mention", value: match[5], id: match[6] });
    }
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

const tagRoutes: Record<string, string> = {
  matter: "/matters",
  case: "/search",
  doc: "/doc-chat",
  job: "/jobs",
};

export function Linkify({ text }: { text: string }) {
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case "url":
            return (
              <a key={i} href={t.value} target="_blank" rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80">
                {t.value.length > 60 ? t.value.slice(0, 57) + "..." : t.value}
              </a>
            );
          case "tag":
            return (
              <a key={i} href={`${tagRoutes[t.tag!] || "/"}/${t.id}`}
                className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                #{t.tag}:{t.id}
              </a>
            );
          case "mention":
            return (
              <span key={i} className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                @{t.id}
              </span>
            );
          default:
            return <span key={i}>{t.value}</span>;
        }
      })}
    </>
  );
}
