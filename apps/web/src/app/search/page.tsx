"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askLegalSearch, type SearchChatResponse } from "@/lib/api";
import {
  Bot,
  Landmark,
  MessageSquare,
  Scale,
  Search,
  Sparkles,
  User,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SearchChatResponse["sources"];
}

function toSearchErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("Could not reach the LexHelm API")) {
      return error.message;
    }
    if (error.message.includes("temporarily unavailable")) {
      return error.message;
    }
    return error.message;
  }
  return "Legal search failed";
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const messageIdRef = useRef(0);
  const lastAutoPromptRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask a legal question and I’ll search Indian case-law results, then turn those results into a plain-English answer for you.",
    },
  ]);

  const submitQuery = useCallback(async (nextQuery?: string) => {
    const value = (nextQuery ?? query).trim();
    if (!value || loading) return;
    const nextId = () => {
      messageIdRef.current += 1;
      return messageIdRef.current;
    };

    const userMessage: ChatMessage = {
      id: `user-${nextId()}`,
      role: "user",
      content: value,
    };

    setMessages((current) => [...current, userMessage]);
    setLoading(true);
    setQuery("");

    try {
      const response = await askLegalSearch(value);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${nextId()}`,
          role: "assistant",
          content: response.answer,
          sources: response.sources,
        },
      ]);
    } catch (error) {
      const message = toSearchErrorMessage(error);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${nextId()}`,
          role: "assistant",
          content: `I couldn’t complete that legal search just now. ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, query]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitQuery();
  };

  useEffect(() => {
    const prompt = searchParams.get("prompt")?.trim();
    if (!prompt || loading || lastAutoPromptRef.current === prompt) return;
    lastAutoPromptRef.current = prompt;
    const timer = window.setTimeout(() => {
      void submitQuery(prompt);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loading, searchParams, submitQuery]);

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border bg-background px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Legal Search Chat</h1>
              <p className="text-sm text-muted-foreground">
                Search Indian legal results through a chat interface and get an LLM-generated answer with supporting sources.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              Indian case law aware
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              LLM answer generation
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Landmark className="h-3.5 w-3.5" />
              Source-backed results
            </Badge>
          </div>
        </motion.div>
      </div>

      <div className="p-6 md:px-10 md:py-8">
        <div className="space-y-4">
          <Card className="min-h-[520px]">
            <CardContent className="space-y-4 p-4 md:p-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-3xl rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                        : "max-w-3xl rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-foreground"
                    }
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      {message.role === "user" ? (
                        <>
                          <User className="h-3.5 w-3.5" />
                          You
                        </>
                      ) : (
                        <>
                          <Bot className="h-3.5 w-3.5" />
                          LexHelm
                        </>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-7">{message.content}</p>
                    {message.sources && message.sources.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Supporting results
                        </p>
                        {message.sources.map((source, index) => (
                          <div key={`${message.id}-${index}`} className="rounded-xl border border-border bg-background px-3 py-3">
                            <p className="text-sm font-semibold text-foreground">
                              {source.title || "Untitled result"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[source.court, source.date, source.citation].filter(Boolean).join(" • ")}
                            </p>
                            {source.headline ? (
                              <p className="mt-2 text-sm text-muted-foreground">{source.headline}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="max-w-sm rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-foreground">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
                      <Bot className="h-3.5 w-3.5" />
                      LexHelm
                    </div>
                    <p>Searching and preparing an answer...</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ask about tenant rights, notice periods, cheque bounce, contract issues..."
                className="h-12 pl-10"
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()} className="h-12 px-5">
              {loading ? "Searching..." : "Ask"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
