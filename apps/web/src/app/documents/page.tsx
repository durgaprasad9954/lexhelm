"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Wand2, Upload, Copy, Check, Send, Bot, User,
  CheckCircle2, Circle, RotateCcw, FileDown, Pencil,
  ArrowLeft, CloudUpload, Sparkles, File,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  listTemplates, parseContract,
  startDraftChat, sendDraftMessage, confirmDraftChat,
  type Template, type DraftChatResponse,
} from "@/lib/api";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  rental_agreement: "Rental / Lease Agreement",
  nda: "Non-Disclosure Agreement",
  service_agreement: "Service Agreement",
  power_of_attorney: "Power of Attorney",
  legal_notice: "Legal Notice",
};

const SUGGESTIONS = [
  "Rental agreement for a flat in Bangalore",
  "NDA between my company and a vendor",
  "Service agreement for a consulting engagement",
  "Legal notice for unpaid rent",
];

export default function DocumentsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ai-draft");
  const [preselectedTemplate, setPreselectedTemplate] = useState<string | undefined>();

  useEffect(() => {
    listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  const handleTemplateChat = (templateId: string) => {
    setPreselectedTemplate(templateId);
    setActiveTab("ai-draft");
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5 px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Drafting</h1>
            <p className="text-sm text-muted-foreground">Describe what you need and AI will draft it through a conversation.</p>
          </div>
        </motion.div>
      </div>

      <div className="p-6 md:p-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="ai-draft" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Wand2 className="h-3.5 w-3.5" /> AI Draft
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="parse" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Upload className="h-3.5 w-3.5" /> Parse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-draft">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <AIDraftTab preselectedTemplate={preselectedTemplate} onTemplateUsed={() => setPreselectedTemplate(undefined)} />
            </motion.div>
          </TabsContent>

          <TabsContent value="templates">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
                </div>
              ) : (
                <TemplatesTab templates={templates} onChatWithTemplate={handleTemplateChat} />
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="parse">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <ParseTab />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ─── Export helpers ─── */

async function exportAsPdf(content: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to export PDF");
    return;
  }
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: 'Georgia', 'Times New Roman', serif; max-width: 700px; margin: 40px auto; padding: 0 20px; font-size: 13px; line-height: 1.7; color: #1a1a1a; }
  h1, h2, h3 { font-family: Arial, sans-serif; }
  h1 { font-size: 18px; text-align: center; margin-bottom: 30px; }
  h2 { font-size: 14px; margin-top: 24px; }
  p { margin: 8px 0; text-align: justify; }
  @media print { body { margin: 0; } @page { margin: 2cm; } }
</style></head><body>
<pre style="white-space:pre-wrap;font-family:inherit;font-size:inherit;line-height:inherit;">${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

async function exportAsDocx(content: string, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const { saveAs } = await import("file-saver");

  const lines = content.split("\n");
  const children: InstanceType<typeof Paragraph>[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed === trimmed.toUpperCase() && trimmed.length > 3 && !/^\d/.test(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 26, font: "Arial" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }));
    } else if (/^\d+\.\s/.test(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, font: "Georgia" })],
        spacing: { before: 200, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    } else if (trimmed === "") {
      children.push(new Paragraph({ children: [], spacing: { before: 100 } }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, font: "Georgia" })],
        spacing: { after: 60 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}.docx`);
}

/* ───────── AI Draft Tab ───────── */
function AIDraftTab({ preselectedTemplate, onTemplateUsed }: {
  preselectedTemplate?: string;
  onTemplateUsed: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<string>("");
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const templateUsedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (generatedContent) {
      setEditableContent(generatedContent);
      setEditableFields({ ...collectedFields });
    }
  }, [generatedContent]);

  useEffect(() => {
    if (preselectedTemplate && !templateUsedRef.current) {
      templateUsedRef.current = true;
      const label = TEMPLATE_LABELS[preselectedTemplate] || preselectedTemplate;
      handleSend(`I need a ${label}`, preselectedTemplate);
      onTemplateUsed();
    }
  }, [preselectedTemplate]);

  const applyResponse = (res: DraftChatResponse) => {
    setSessionId(res.session_id);
    setPhase(res.phase);
    setTemplateId(res.template_id);
    setCollectedFields(res.collected_fields);
    setMissingFields(res.missing_fields);
    if (res.generated_content) setGeneratedContent(res.generated_content);

    const assistantMsg: ChatMsg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: res.assistant_message,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleSend = async (text?: string, tplId?: string) => {
    const msg = (text || input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      let res: DraftChatResponse;
      if (!sessionId) {
        res = await startDraftChat(msg, tplId);
      } else {
        res = await sendDraftMessage(sessionId, msg);
      }
      applyResponse(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;
    setSending(true);
    try {
      const res = await confirmDraftChat(sessionId);
      applyResponse(res);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    setSessionId(null);
    setMessages([]);
    setInput("");
    setPhase("idle");
    setTemplateId(null);
    setCollectedFields({});
    setMissingFields([]);
    setGeneratedContent(null);
    setEditableContent("");
    setEditableFields({});
    templateUsedRef.current = false;
  };

  const copyContent = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFieldChange = (key: string, value: string) => {
    const oldValue = editableFields[key];
    setEditableFields((f) => ({ ...f, [key]: value }));
    if (oldValue && value && editableContent.includes(oldValue)) {
      setEditableContent((c) => c.replaceAll(oldValue, value));
    }
  };

  const docTitle = templateId
    ? (TEMPLATE_LABELS[templateId] || templateId).replace(/\s+/g, "-").toLowerCase()
    : "document-draft";

  // ── Editor View (after generation) ──
  if (generatedContent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between rounded-xl bg-accent/30 p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> New Draft
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-semibold">
              {templateId ? TEMPLATE_LABELS[templateId] || templateId : "Document"}
            </span>
            <Badge variant="default" className="text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> Generated
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyContent} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAsPdf(editableContent, docTitle)} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportAsDocx(editableContent, docTitle)} className="gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> DOCX
            </Button>
          </div>
        </div>

        {/* Split: Fields (left) | Editor (right) */}
        <div className="flex gap-4" style={{ height: "calc(100vh - 290px)" }}>
          {/* Left: Parsed Fields */}
          <div className="w-80 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="border-b border-border px-4 py-3 bg-accent/20">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-primary" /> Document Fields
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Edit fields to update the document
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {Object.entries(editableFields).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                      {key.replace(/_/g, " ")}
                    </label>
                    {val.length > 60 ? (
                      <Textarea
                        value={val}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        rows={2}
                        className="text-sm resize-none rounded-lg"
                      />
                    ) : (
                      <Input
                        value={val}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="text-sm rounded-lg"
                      />
                    )}
                  </div>
                ))}
                {Object.keys(editableFields).length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No fields extracted
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Document Editor */}
          <div className="flex-1 border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="border-b border-border px-4 py-3 bg-accent/20 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" /> Document Editor
              </h3>
              <span className="text-xs text-muted-foreground">
                {editableContent.split("\n").length} lines
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <textarea
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                className="w-full h-full resize-none border-0 bg-card p-6 text-sm leading-relaxed font-[Georgia,serif] focus:outline-none"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                spellCheck
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Idle: Welcome + Suggestions ──
  if (phase === "idle" && messages.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500/5 to-orange-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Describe the document you need</CardTitle>
            </div>
            <CardDescription>
              Tell me what you need in plain English. I will ask for any missing details through our conversation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="flex gap-2">
              <Textarea
                placeholder="e.g., I need a rental agreement for a 2BHK flat in Koramangala, Bangalore..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                className="resize-none rounded-xl"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim()} size="icon" className="shrink-0 self-end rounded-xl h-11 w-11">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick start:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg hover:bg-primary/5 hover:border-primary/30 transition-all"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Chat Phase (collecting fields) ──
  return (
    <div className="flex gap-4">
      {/* Chat column */}
      <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden" style={{ height: "calc(100vh - 290px)" }}>
        {/* Chat header */}
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0 bg-accent/20">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">
              {templateId ? TEMPLATE_LABELS[templateId] || templateId : "AI Drafting"}
            </span>
            {phase !== "idle" && (
              <Badge variant={phase === "done" ? "default" : "secondary"} className="text-xs">
                {phase}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-2xl mx-auto">
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
                      m.content
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

        {/* Confirm button */}
        {phase === "confirm" && (
          <div className="border-t border-border p-3 flex justify-center shrink-0 bg-primary/5">
            <Button onClick={handleConfirm} disabled={sending} className="w-full max-w-xs gap-2 rounded-xl">
              <CheckCircle2 className="h-4 w-4" />
              Generate Document
            </Button>
          </div>
        )}

        {/* Input */}
        {phase !== "done" && (
          <div className="border-t border-border p-3 shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2 max-w-2xl mx-auto"
            >
              <Textarea
                placeholder={phase === "confirm" ? "Want to change anything? Or say 'generate' to proceed..." : "Type your response..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                className="resize-none min-h-[44px] rounded-xl"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()} className="rounded-xl h-11 w-11 shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Sidebar: Collection progress */}
      {templateId && Object.keys(collectedFields).length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 border border-border rounded-xl p-5 space-y-4 shrink-0 hidden lg:block overflow-y-auto"
          style={{ height: "calc(100vh - 290px)" }}
        >
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            Collection Progress
          </h3>
          {templateId && (
            <Badge variant="outline" className="text-xs font-medium">
              {TEMPLATE_LABELS[templateId] || templateId}
            </Badge>
          )}

          {/* Progress bar */}
          {(() => {
            const total = Object.keys(collectedFields).length + missingFields.length;
            const done = Object.keys(collectedFields).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-medium">{done} of {total} fields</span>
                  <span className="font-semibold text-primary">{pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" as const }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Fields list */}
          <div className="space-y-2.5">
            {Object.entries(collectedFields).map(([key, val]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground truncate">{val}</p>
                </div>
              </motion.div>
            ))}
            {missingFields.map((key) => (
              <div key={key} className="flex items-start gap-2 opacity-40">
                <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs capitalize">{key.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ───────── Templates Tab ───────── */
function TemplatesTab({ templates, onChatWithTemplate }: {
  templates: Template[];
  onChatWithTemplate: (templateId: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {templates.map((t, i) => (
        <motion.div
          key={t.template_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
            <CardHeader>
              <CardTitle className="text-base group-hover:text-primary transition-colors">{t.name}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {t.required_fields.map((p) => (
                  <Badge key={p} variant="default" className="text-xs">{p.replace(/_/g, " ")}</Badge>
                ))}
                {t.optional_fields.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">{p.replace(/_/g, " ")}</Badge>
                ))}
              </div>
              <Button size="sm" onClick={() => onChatWithTemplate(t.template_id)} className="gap-1.5 rounded-lg">
                <Wand2 className="h-3.5 w-3.5" /> Draft with AI Chat
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ───────── Parse Tab ───────── */
function ParseTab() {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    try {
      const r = await parseContract(file);
      setResult(r.analysis);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: loading,
  });

  return (
    <div className="space-y-4">
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardTitle className="text-base">Parse Existing Contract</CardTitle>
          <CardDescription>Upload a contract to extract parties, terms, obligations, and risks.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div
            {...getRootProps()}
            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40 hover:bg-accent/30"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                isDragActive ? "bg-primary/10" : "bg-muted"
              }`}>
                <CloudUpload className={`h-6 w-6 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className="text-sm font-medium">{loading ? "Analyzing..." : "Drop a contract file here"}</p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {["PDF", "DOCX", "TXT"].map((fmt) => (
                  <span key={fmt} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    <File className="h-3 w-3" />
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Analysis Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-accent/30 p-4 rounded-xl max-h-[500px] overflow-y-auto font-mono text-foreground/80">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
