"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, FileText, User, Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getDocSession, chatWithDoc, type DocSessionDetail, type DocMessage } from "@/lib/api";
import { Linkify } from "@/lib/linkify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function DocChatSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<DocSessionDetail | null>(null);
  const [messages, setMessages] = useState<DocMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    const fetchSession = () => {
      getDocSession(sessionId)
        .then((s) => {
          if (cancelled) return;
          setSession(s);
          setMessages(s.messages);
          setLoading(false);
          if (s.status === "processing") {
            pollTimer = setTimeout(fetchSession, 2000);
          }
        })
        .catch(() => {
          if (!cancelled) {
            toast.error("Failed to load session");
            setLoading(false);
          }
        });
    };

    fetchSession();

    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    setSending(true);

    const tempUser: DocMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);

    try {
      const res = await chatWithDoc(sessionId, msg);
      const assistantMsg: DocMessage = {
        id: `resp-${Date.now()}`,
        role: "assistant",
        content: res.assistant_message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
      setInput(msg);
    } finally {
      setSending(false);
    }
  }, [input, sending, sessionId]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-destructive">Session not found.</p>
        <Link href="/doc-chat" className="text-sm text-primary underline">Back to sessions</Link>
      </div>
    );
  }

  const analysis = session.analysis as Record<string, unknown> | null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0 bg-background/80 backdrop-blur-sm"
      >
        <Link href="/doc-chat">
          <Button variant="ghost" size="icon" className="rounded-lg hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{session.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {session.byte_size ? `${(session.byte_size / 1024).toFixed(0)} KB` : ""} &middot; {session.content_type}
          </p>
        </div>
        <Badge
          variant={session.status === "ready" ? "default" : session.status === "processing" ? "secondary" : "destructive"}
          className="text-xs"
        >
          {session.status}
        </Badge>
      </motion.div>

      <div className="flex flex-1 overflow-hidden">
        {/* Analysis sidebar */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-80 border-r border-border overflow-y-auto p-5 space-y-5 shrink-0 hidden lg:block bg-accent/20"
          >
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Document Analysis
            </h3>
            {analysis.document_type ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Type</p>
                <Badge variant="outline" className="font-medium">{String(analysis.document_type)}</Badge>
              </div>
            ) : null}
            {analysis.summary ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Summary</p>
                <p className="text-sm leading-relaxed">{String(analysis.summary)}</p>
              </div>
            ) : null}
            {Array.isArray(analysis.parties) && analysis.parties.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Parties</p>
                <div className="flex flex-wrap gap-1.5">
                  {(analysis.parties as Array<string | { name: string; role?: string }>).map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {typeof p === "string" ? p : p.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {Array.isArray(analysis.key_terms) && analysis.key_terms.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Key Terms</p>
                <ul className="text-xs space-y-1.5">
                  {(analysis.key_terms as Array<string | { label: string; value?: string }>).map((t, i) => (
                    <li key={i} className="text-muted-foreground">
                      {typeof t === "string" ? `• ${t}` : `• ${t.label}: ${t.value ?? ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {Array.isArray(analysis.risks) && analysis.risks.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Risks</p>
                <ul className="text-xs space-y-1.5">
                  {(analysis.risks as string[]).map((r, i) => (
                    <li key={i} className="text-destructive/80">{`• ${r}`}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto py-4">
              {session.status === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-12"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-6 w-6 text-primary" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground font-medium">Analyzing document...</p>
                </motion.div>
              )}
              {session.status !== "processing" && messages.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-3">
                    <Bot className="h-7 w-7 text-primary/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask a question about the document to get started.
                  </p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
                  >
                    {m.role === "assistant" && (
                      <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <Linkify text={m.content} />
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="shrink-0 h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 0.15, 0.3].map((delay) => (
                        <motion.div
                          key={delay}
                          className="h-2 w-2 rounded-full bg-muted-foreground/40"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-4 shrink-0 bg-background/80 backdrop-blur-sm">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2 max-w-3xl mx-auto"
            >
              <Textarea
                placeholder="Ask about the document..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                className="resize-none min-h-[44px] rounded-xl bg-accent/30 border-border/50 focus:border-primary/50"
                disabled={session.status !== "ready"}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !input.trim() || session.status !== "ready"}
                className="rounded-xl h-11 w-11 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
