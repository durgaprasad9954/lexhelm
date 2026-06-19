"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Send, Bot, User, CheckCircle2, Loader2,
  MessageSquare, Download, Save,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { API_BASE, API_TOKEN } from "@/lib/api";
import { LegalEditor } from "@/components/editor/legal-editor";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface DocumentSession {
  id: string;
  phone_number: string;
  name: string | null;
  document_type: string;
  template_id: string | null;
  current_content: string | null;
  status: string;
  version: number;
  created_at: string;
}

export default function PublicDocumentChat() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<DocumentSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentContent, setDocumentContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/whatsapp-documents/status/${sessionId}`, {
          headers: { "X-API-TOKEN": API_TOKEN },
        });
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        if (cancelled) return;
        setSession(data);
        const content = data.current_content || "";
        setDocumentContent(content);
        setSavedContent(content);
        setLoading(false);
      } catch {
        if (cancelled) return;
        toast.error("Failed to load document");
        setLoading(false);
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveDocument = async () => {
    if (!session || saving || documentContent === savedContent) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/whatsapp-documents/content/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-TOKEN": API_TOKEN,
        },
        body: JSON.stringify({ content: documentContent }),
      });
      if (!res.ok) throw new Error("Failed to save document");
      const data = await res.json();
      setSavedContent(data.current_content);
      setDocumentContent(data.current_content);
      setSession((prev) => prev ? { ...prev, version: data.version, current_content: data.current_content } : prev);
      toast.success("Document changes saved");
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/whatsapp-documents/chat/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-TOKEN": API_TOKEN,
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.updated_content) {
        setDocumentContent(data.updated_content);
        setSavedContent(data.updated_content);
        setSession((prev) => prev ? { ...prev, version: data.version, current_content: data.updated_content } : prev);
        toast.success("Document updated!");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async () => {
    try {
      if (documentContent !== savedContent) {
        await saveDocument();
      }
      const res = await fetch(`${API_BASE}/whatsapp-documents/approve/${sessionId}`, {
        method: "POST",
        headers: { "X-API-TOKEN": API_TOKEN },
      });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Document approved!");
      setSession((prev) => prev ? { ...prev, status: "completed" } : prev);
    } catch {
      toast.error("Failed to approve document");
    }
  };

  const downloadDocument = () => {
    if (!documentContent) return;
    const blob = new Blob([documentContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-${session?.document_type || "legal"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your document...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Document Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              The document link may have expired or is invalid.
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Go to LexHelm
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasUnsavedChanges = documentContent !== savedContent;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">LexHelm Document</h1>
              <p className="text-sm text-muted-foreground">
                {session.name || session.phone_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline">Unsaved changes</Badge>
            )}
            <Badge variant={session.status === "completed" ? "default" : "secondary"}>
              {session.status}
            </Badge>
            <span className="text-sm text-muted-foreground">v{session.version}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4 min-h-0">
          <Card className="h-[calc(100vh-140px)]">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Editable Document
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadDocument}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveDocument}
                  disabled={!hasUnsavedChanges || saving}
                  className="gap-1.5"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save
                </Button>
                {session.status !== "completed" && (
                  <Button size="sm" onClick={handleApprove} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100vh-220px)]">
              <LegalEditor
                content={documentContent}
                editable={session.status !== "completed"}
                onChange={setDocumentContent}
                className="h-full"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 min-h-0">
          <Card className="h-[calc(100vh-140px)] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat with AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col p-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-6" ref={scrollRef}>
                <div className="space-y-4 py-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm max-w-[80%]">
                      <p className="font-medium mb-1">AI Assistant</p>
                      <p>
                        Open and edit the document on the left, or ask me to make changes for you.
                      </p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        <li>• Edit the document directly and press Save</li>
                        <li>• Ask for clause changes in chat</li>
                        <li>• Approve the final version when ready</li>
                      </ul>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.role === "user" ? "bg-primary" : "bg-primary/10"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="h-4 w-4 text-primary-foreground" />
                          ) : (
                            <Bot className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 text-sm max-w-[80%] ${
                            msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <p className="font-medium mb-1">
                            {msg.role === "user" ? "You" : "AI Assistant"}
                          </p>
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {sending && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="p-4 space-y-3">
                <Textarea
                  placeholder="Type your message here... (e.g., 'Add a clause about pets')"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="min-h-[80px] resize-none"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  <Button onClick={sendMessage} disabled={!input.trim() || sending} className="gap-2">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
