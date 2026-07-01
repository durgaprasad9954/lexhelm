"use client";
import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  ArrowLeft, CloudUpload, Sparkles, File, Printer,
  PanelLeftClose, PanelLeftOpen, Mail, CheckCheck, X,
} from "lucide-react";
import { diffWords } from "diff";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  generateDocument, listTemplates, parseContract,
  startDraftChat, sendDraftMessage, confirmDraftChat,
  refineDraftDocument, sendDocumentEmail,
  getDraftChatSession, listDraftChatSessions, saveDraftChatContent, saveGeneratedDraftSession, deleteDraftChatSession,
  type Template, type DraftChatResponse, type DraftChatSessionDetail, type DraftChatSessionSummary,
} from "@/lib/api";
import { LegalEditor, plainTextToHtml } from "@/components/editor/legal-editor";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/lib/sidebar-context";
import { RentalAgreementIntake, type RentalAgreementFormValues } from "@/components/documents/rental-agreement-intake";

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

const TEMPLATE_ICONS: Record<string, string> = {
  rental_agreement: "🏠",
  nda: "🤐",
  service_agreement: "🤝",
  power_of_attorney: "⚖️",
  legal_notice: "📜",
};

const SUGGESTIONS = [
  "Rental agreement for a flat in Bangalore",
  "NDA for a new vendor",
  "Freelancer service contract",
  "Employment offer letter",
];

function getInitialDraftRoute() {
  if (typeof window === "undefined") {
    return { template: undefined, prompt: undefined, tab: "ai-draft" };
  }

  const params = new URLSearchParams(window.location.search);
  const template = params.get("template") || undefined;
  const feature = params.get("feature");
  const prompt = params.get("prompt") || undefined;
  const tab = params.get("tab") || "ai-draft";
  const resume = params.get("resume");

  return {
    template,
    prompt: feature === "instant-lease"
      ? "I want to start the instant lease agreement workflow. Please create a rental or lease agreement and ask me for the required details."
      : prompt,
    tab,
    resumeSessionId: resume,
  };
}

export default function DocumentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialRoute] = useState(getInitialDraftRoute);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedDocumentsLoading, setSavedDocumentsLoading] = useState(true);
  const [savedDocuments, setSavedDocuments] = useState<DraftChatSessionSummary[]>([]);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [preselectedTemplate, setPreselectedTemplate] = useState<string | undefined>(initialRoute.template);
  const [initialDraftPrompt, setInitialDraftPrompt] = useState<string | undefined>(initialRoute.prompt);
  const [resumeSessionId, setResumeSessionId] = useState<string | null>(initialRoute.resumeSessionId ?? null);
  const [editorMode, setEditorMode] = useState(false);
  const searchTab = searchParams.get("tab");
  const resolvedActiveTab = searchTab === "saved" || searchTab === "templates" || searchTab === "parse" || searchTab === "ai-draft"
    ? searchTab
    : activeTab;

  const setRouteTab = useCallback((tab: string, options?: { resume?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    if (options?.resume) {
      params.set("resume", options.resume);
    } else {
      params.delete("resume");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const refreshSavedDocuments = useCallback(() => {
    setSavedDocumentsLoading(true);
    listDraftChatSessions(50)
      .then((r) => {
        setSavedDocuments(
          r.sessions.filter((session) => session.phase === "done" || session.status === "completed"),
        );
      })
      .catch(() => toast.error("Failed to load saved documents"))
      .finally(() => setSavedDocumentsLoading(false));
  }, []);

  useEffect(() => {
    listTemplates()
      .then((r) => setTemplates(r.templates))
      .catch(() => toast.error("Failed to load templates"))
      .finally(() => setLoading(false));

    listDraftChatSessions(50)
      .then((r) => {
        setSavedDocuments(
          r.sessions.filter((session) => session.phase === "done" || session.status === "completed"),
        );
      })
      .catch(() => toast.error("Failed to load saved documents"))
      .finally(() => setSavedDocumentsLoading(false));
  }, []);

  const handleDeleteDocument = useCallback((sessionId: string) => {
    deleteDraftChatSession(sessionId)
      .then(() => {
        setSavedDocuments((prev) => prev.filter((s) => s.session_id !== sessionId));
        toast.success("Document deleted");
      })
      .catch(() => toast.error("Failed to delete document"));
  }, []);

  const handleTemplateChat = (templateId: string) => {
    setPreselectedTemplate(templateId);
    setInitialDraftPrompt(undefined);
    setActiveTab("ai-draft");
    setRouteTab("ai-draft");
  };

  const handleOpenSavedDocument = (sessionId: string) => {
    setResumeSessionId(sessionId);
    setActiveTab("ai-draft");
    setRouteTab("ai-draft", { resume: sessionId });
  };

  return (
    <div className="min-h-full">
      {/* Header — hidden in editor mode */}
      {!editorMode && (
        <div className="border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.96))] px-4 py-6 md:px-10 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-start gap-3 sm:flex-row sm:items-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create a Document</h1>
              <p className="text-sm text-muted-foreground">Describe what you need and the AI will create a ready-to-use legal document.</p>
            </div>
          </motion.div>
        </div>
      )}

      <div className={editorMode ? "p-2 sm:p-3" : "p-4 md:p-8 lg:p-10"}>
        <Tabs
          value={resolvedActiveTab}
          onValueChange={(nextTab) => {
            setActiveTab(nextTab);
            if (nextTab !== "ai-draft") {
              setResumeSessionId(null);
            }
            setRouteTab(nextTab, { resume: nextTab === "ai-draft" ? resumeSessionId : null });
          }}
          className="space-y-6"
        >
          {!editorMode && (
            <TabsList className="bg-muted/50">
              <TabsTrigger value="ai-draft" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Wand2 className="h-3.5 w-3.5" /> Create with AI
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" /> Browse Templates
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Your Documents
              </TabsTrigger>
              <TabsTrigger value="parse" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Upload className="h-3.5 w-3.5" /> Analyze Existing
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="ai-draft">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <AIDraftTab
                preselectedTemplate={preselectedTemplate}
                initialPrompt={initialDraftPrompt}
                resumeSessionId={resumeSessionId}
                onTemplateUsed={() => {
                  setPreselectedTemplate(undefined);
                  setInitialDraftPrompt(undefined);
                }}
                onSessionLoaded={() => {
                  setResumeSessionId(null);
                  setRouteTab("ai-draft");
                }}
                onSavedDocumentsChange={refreshSavedDocuments}
                onEditorModeChange={setEditorMode}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="templates">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
                </div>
              ) : (
                <TemplatesTab templates={templates} onChatWithTemplate={handleTemplateChat} />
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="saved">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SavedDocumentsTab
                loading={savedDocumentsLoading}
                sessions={savedDocuments}
                onOpen={handleOpenSavedDocument}
                onDelete={handleDeleteDocument}
              />
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

async function exportEditorAsPdf(editorHtml: string, title: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups to export PDF");
    return;
  }
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Inter, Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; font-size: 16px; line-height: 1.7; color: #1f1b1a; background: #ffffff; }
  h1 { font-family: Inter, Arial, sans-serif; font-size: 24px; text-align: center; margin: 1.5em 0 0.75em; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #ddd; padding-bottom: 0.4em; }
  h2 { font-family: Inter, Arial, sans-serif; font-size: 20px; margin: 1.25em 0 0.5em; }
  h3 { font-family: Inter, Arial, sans-serif; font-size: 18px; font-weight: 700; margin: 1em 0 0.4em; }
  h4 { font-family: Inter, Arial, sans-serif; font-size: 16px; font-weight: 600; margin: 0.75em 0 0.3em; }
  p { margin: 0.5em 0; text-align: justify; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  mark { background-color: #fef08a; padding: 0 2px; }
  blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; font-style: italic; color: #555; }
  ul { list-style: disc; padding-left: 1.5em; margin: 0.5em 0; }
  ol { list-style: decimal; padding-left: 1.5em; margin: 0.5em 0; }
  li { margin: 0.25em 0; }
  hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { background: #faf4f3; font-weight: bold; font-family: Inter, Arial, sans-serif; font-size: 12px; }
  @media print { body { margin: 0; } @page { margin: 2cm; size: A4; } }
</style></head><body>
${editorHtml}
</body></html>`);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

async function exportEditorAsDocx(editorHtml: string, title: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import("docx");
  const { saveAs } = await import("file-saver");

  // Parse HTML into a temporary DOM to extract structure
  const parser = new DOMParser();
  const doc = parser.parseFromString(editorHtml, "text/html");
  const children: InstanceType<typeof Paragraph>[] = [];

  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();

    if (tag === "h1") {
      children.push(new Paragraph({
        children: [new TextRun({ text: el.textContent || "", bold: true, size: 32, font: "Inter" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.CENTER,
      }));
    } else if (tag === "h2") {
      children.push(new Paragraph({
        children: [new TextRun({ text: el.textContent || "", bold: true, size: 26, font: "Inter" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }));
    } else if (tag === "h3") {
      children.push(new Paragraph({
        children: [new TextRun({ text: el.textContent || "", bold: true, size: 24, font: "Inter" })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 80 },
      }));
    } else if (tag === "p") {
      const runs = extractRuns(el);
      children.push(new Paragraph({
        children: runs,
        spacing: { after: 80 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    } else if (tag === "blockquote") {
      children.push(new Paragraph({
        children: [new TextRun({ text: el.textContent || "", italics: true, size: 22, font: "Inter", color: "666666" })],
        spacing: { before: 200, after: 200 },
        indent: { left: 720 },
      }));
    } else if (tag === "ul" || tag === "ol") {
      const items = el.querySelectorAll(":scope > li");
      items.forEach((li, idx) => {
        const prefix = tag === "ol" ? `${idx + 1}. ` : "• ";
        children.push(new Paragraph({
          children: [new TextRun({ text: prefix + (li.textContent || ""), size: 22, font: "Inter" })],
          spacing: { after: 40 },
          indent: { left: 360 },
        }));
      });
    } else if (tag === "hr") {
      children.push(new Paragraph({ children: [], spacing: { before: 200, after: 200 } }));
    } else {
      // Recurse for divs etc
      el.childNodes.forEach(processNode);
    }
  }

  function extractRuns(el: HTMLElement): InstanceType<typeof TextRun>[] {
    const runs: InstanceType<typeof TextRun>[] = [];
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        runs.push(new TextRun({ text: child.textContent || "", size: 22, font: "Inter" }));
      } else {
        const childEl = child as HTMLElement;
        const tag = childEl.tagName?.toLowerCase();
        const text = childEl.textContent || "";
        if (tag === "strong" || tag === "b") {
          runs.push(new TextRun({ text, bold: true, size: 22, font: "Inter" }));
        } else if (tag === "em" || tag === "i") {
          runs.push(new TextRun({ text, italics: true, size: 22, font: "Inter" }));
        } else if (tag === "u") {
          runs.push(new TextRun({ text, underline: {}, size: 22, font: "Inter" }));
        } else if (tag === "s" || tag === "strike") {
          runs.push(new TextRun({ text, strike: true, size: 22, font: "Inter" }));
        } else if (tag === "mark") {
          runs.push(new TextRun({ text, highlight: "yellow", size: 22, font: "Inter" }));
        } else {
          runs.push(new TextRun({ text, size: 22, font: "Inter" }));
        }
      }
    });
    if (runs.length === 0) {
      runs.push(new TextRun({ text: el.textContent || "", size: 22, font: "Inter" }));
    }
    return runs;
  }

  doc.body.childNodes.forEach(processNode);

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
  }

  const docx = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });
  const blob = await Packer.toBlob(docx);
  saveAs(blob, `${title}.docx`);
}

/* ───────── AI Draft Tab ───────── */
function AIDraftTab({ preselectedTemplate, initialPrompt, resumeSessionId, onTemplateUsed, onSessionLoaded, onSavedDocumentsChange, onEditorModeChange }: {
  preselectedTemplate?: string;
  initialPrompt?: string;
  resumeSessionId?: string | null;
  onTemplateUsed: () => void;
  onSessionLoaded: () => void;
  onSavedDocumentsChange: () => void;
  onEditorModeChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const { autoCollapse, autoExpand } = useSidebar();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [showRentalIntake, setShowRentalIntake] = useState(preselectedTemplate === "rental_agreement");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [collectedFields, setCollectedFields] = useState<Record<string, string>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>("");
  const [savedEditorHtml, setSavedEditorHtml] = useState<string>("");
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [showRefineChat, setShowRefineChat] = useState(true);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<ChatMsg[]>([]);
  const [editorFlash, setEditorFlash] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    oldContent: string;
    newContent: string;
    instruction: string;
  } | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [copyingShareLink, setCopyingShareLink] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailCc, setEmailCc] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const refineScrollRef = useRef<HTMLDivElement>(null);
  const templateUsedRef = useRef<string | null>(null);
  const loadedSessionRef = useRef<string | null>(null);
  const openPreselectedRentalIntake = useEffectEvent(() => {
    startTransition(() => {
      setShowRentalIntake(true);
    });
    onTemplateUsed();
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (generatedContent) {
      autoCollapse();
      onEditorModeChange(true);
    }
  }, [autoCollapse, generatedContent, onEditorModeChange]);

  const applyResponse = useCallback((res: DraftChatResponse) => {
    setSessionId(res.session_id);
    setPhase(res.phase);
    setTemplateId(res.template_id);
    setCollectedFields(res.collected_fields);
    setMissingFields(res.missing_fields);
    if (res.generated_content) {
      setEditableFields({ ...res.collected_fields });
      setGeneratedContent(res.generated_content);
      const resolvedHtml = res.generated_content.trim().startsWith("<")
        ? res.generated_content
        : plainTextToHtml(res.generated_content);
      setEditorHtml(resolvedHtml);
      setSavedEditorHtml(resolvedHtml);
      onSavedDocumentsChange();
    }

    const assistantMsg: ChatMsg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: res.assistant_message,
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }, [onSavedDocumentsChange]);

  useEffect(() => {
    if (!resumeSessionId || loadedSessionRef.current === resumeSessionId) return;
    loadedSessionRef.current = resumeSessionId;

    getDraftChatSession(resumeSessionId)
      .then((session: DraftChatSessionDetail) => {
        setSessionId(session.session_id);
        setTemplateId(session.template_id);
        setPhase(session.phase);
        setCollectedFields(session.collected_fields);
        setMissingFields(session.missing_fields);
        setEditableFields(session.collected_fields);
        setGeneratedContent(session.generated_content);
        const resolvedHtml = session.generated_content
          ? (session.generated_content.trim().startsWith("<")
            ? session.generated_content
            : plainTextToHtml(session.generated_content))
          : "";
        setEditorHtml(resolvedHtml);
        setSavedEditorHtml(resolvedHtml);
        setMessages(
          session.messages.map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        );
        onSessionLoaded();
      })
      .catch((error: unknown) => {
        loadedSessionRef.current = null;
        toast.error(error instanceof Error ? error.message : "Failed to open saved document");
      });
  }, [onSessionLoaded, resumeSessionId]);

  const handleSend = useCallback(async (text?: string, tplId?: string) => {
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
  }, [applyResponse, input, sending, sessionId]);

  useEffect(() => {
    if (preselectedTemplate === "rental_agreement") {
      openPreselectedRentalIntake();
      return;
    }
    if (preselectedTemplate && templateUsedRef.current !== `${preselectedTemplate}:${initialPrompt || ""}`) {
      templateUsedRef.current = `${preselectedTemplate}:${initialPrompt || ""}`;
      const label = TEMPLATE_LABELS[preselectedTemplate] || preselectedTemplate;
      handleSend(initialPrompt || `I need a ${label}`, preselectedTemplate);
      onTemplateUsed();
    }
  }, [preselectedTemplate, initialPrompt, handleSend, onTemplateUsed]);

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
    autoExpand();
    onEditorModeChange(false);
    setSessionId(null);
    setMessages([]);
    setInput("");
    setShowRentalIntake(false);
    setPhase("idle");
    setTemplateId(null);
    setCollectedFields({});
    setMissingFields([]);
    setGeneratedContent(null);
    setEditorHtml("");
    setSavedEditorHtml("");
    setEditableFields({});
    setPendingEdit(null);
    templateUsedRef.current = null;
    loadedSessionRef.current = null;
  };

  const handleRentalAgreementGenerate = async (values: RentalAgreementFormValues) => {
    setSending(true);
    try {
      const params = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value.trim().length > 0),
      );
      const response = await generateDocument({
        template_id: "rental_agreement",
        params,
      });
      const resolvedHtml = response.content.trim().startsWith("<")
        ? response.content
        : plainTextToHtml(response.content);
      setSessionId(response.session_id ?? null);
      setTemplateId("rental_agreement");
      setEditableFields(params);
      setCollectedFields(params);
      setMissingFields([]);
      setGeneratedContent(response.content);
      setEditorHtml(resolvedHtml);
      setSavedEditorHtml(resolvedHtml);
      setPhase("done");
      toast.success("Document generated and saved to your account.");
      onSavedDocumentsChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to generate rental agreement");
    } finally {
      setSending(false);
    }
  };

  const copyContent = () => {
    // Copy plain text from editorHtml by stripping tags
    const tmp = document.createElement("div");
    tmp.innerHTML = editorHtml || generatedContent || "";
    const text = tmp.textContent || tmp.innerText || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const html = editorHtml || generatedContent || "";
    exportEditorAsPdf(html, docTitle);
  };

  const handleSaveDocument = async () => {
    const html = editorHtml || generatedContent || "";
    if (!html.trim() || documentSaving) return;
    if (!hasUnsavedChanges) {
      toast.success("Document is already saved in Your Documents.");
      return;
    }
    setDocumentSaving(true);
    try {
      const res = sessionId
        ? await saveDraftChatContent(sessionId, html)
        : await saveGeneratedDraftSession(templateId || "custom", editableFields, html);
      const resolvedHtml = res.generated_content
        ? (res.generated_content.trim().startsWith("<")
          ? res.generated_content
          : plainTextToHtml(res.generated_content))
        : html;
      setSessionId(res.session_id);
      setGeneratedContent(res.generated_content ?? html);
      setEditorHtml(resolvedHtml);
      setSavedEditorHtml(resolvedHtml);
      toast.success("Document saved.");
      onSavedDocumentsChange();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save document");
    } finally {
      setDocumentSaving(false);
    }
  };

  const ensureShareableSessionId = async () => {
    const html = editorHtml || generatedContent || "";
    if (!html.trim()) {
      throw new Error("Generate a document before creating a share link.");
    }

    if (sessionId) {
      if (hasUnsavedChanges) {
        const res = await saveDraftChatContent(sessionId, html);
        const resolvedHtml = res.generated_content
          ? (res.generated_content.trim().startsWith("<")
            ? res.generated_content
            : plainTextToHtml(res.generated_content))
          : html;
        setGeneratedContent(res.generated_content ?? html);
        setEditorHtml(resolvedHtml);
        setSavedEditorHtml(resolvedHtml);
      }
      return sessionId;
    }

    const res = await saveGeneratedDraftSession(templateId || "custom", editableFields, html);
    const resolvedHtml = res.generated_content
      ? (res.generated_content.trim().startsWith("<")
        ? res.generated_content
        : plainTextToHtml(res.generated_content))
      : html;
    setSessionId(res.session_id);
    setGeneratedContent(res.generated_content ?? html);
    setEditorHtml(resolvedHtml);
    setSavedEditorHtml(resolvedHtml);
    onSavedDocumentsChange();
    return res.session_id;
  };

  const handleCopyShareLink = async () => {
    if (copyingShareLink) return;
    setCopyingShareLink(true);
    try {
      const ensuredSessionId = await ensureShareableSessionId();
      if (!ensuredSessionId) {
        throw new Error("Unable to create a share link for this document.");
      }
      const shareUrl = `${window.location.origin}/public-doc/${ensuredSessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Editable document link copied.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to copy share link");
    } finally {
      setCopyingShareLink(false);
    }
  };

  const handleRefine = async () => {
    const msg = refineInput.trim();
    if (!msg || refining || !sessionId) return;
    setRefineInput("");
    setRefining(true);

    const userMsg: ChatMsg = { id: `ru-${Date.now()}`, role: "user", content: msg };
    setRefineMessages((prev) => [...prev, userMsg]);

    try {
      const currentContent = editorHtml || generatedContent || "";
      const res = await refineDraftDocument(sessionId, msg, currentContent);
      if (res.generated_content) {
        // Store as pending edit for accept/reject instead of auto-applying
        setPendingEdit({
          oldContent: currentContent,
          newContent: res.generated_content,
          instruction: msg,
        });
      }
      const assistantMsg: ChatMsg = {
        id: `ra-${Date.now()}`,
        role: "assistant",
        content: res.assistant_message,
      };
      setRefineMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refinement failed");
      setRefineMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setRefineInput(msg);
    } finally {
      setRefining(false);
    }
  };

  useEffect(() => {
    refineScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [refineMessages, refining]);

  const handleEmailSend = async () => {
    if (!emailTo.trim() || emailSending) return;
    setEmailSending(true);
    try {
      const ensuredSessionId = await ensureShareableSessionId();
      if (!ensuredSessionId) {
        throw new Error("Unable to create a document link for email.");
      }
      const documentLink = `${window.location.origin}/public-doc/${ensuredSessionId}`;
      await sendDocumentEmail({
        to: emailTo.split(",").map((e) => e.trim()).filter(Boolean),
        cc: emailCc ? emailCc.split(",").map((e) => e.trim()).filter(Boolean) : undefined,
        subject: emailSubject || docTitle,
        note: emailNote || undefined,
        document_link: documentLink,
        document_title: docTitle,
        sender_email: user?.email,
        sender_name: user?.name,
      });
      toast.success("Editable document link sent successfully");
      setShowEmailDialog(false);
      setEmailTo("");
      setEmailCc("");
      setEmailSubject("");
      setEmailNote("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  };

  const acceptEdit = () => {
    if (!pendingEdit) return;
    setGeneratedContent(pendingEdit.newContent);
    setEditorHtml(pendingEdit.newContent.trim().startsWith("<") ? pendingEdit.newContent : plainTextToHtml(pendingEdit.newContent));
    setEditorFlash(true);
    setTimeout(() => setEditorFlash(false), 1500);
    setPendingEdit(null);
  };

  const rejectEdit = () => {
    setPendingEdit(null);
    toast("Edit discarded");
  };

  const docTitle = templateId
    ? (TEMPLATE_LABELS[templateId] || templateId).replace(/\s+/g, "-").toLowerCase()
    : "document-draft";
  const currentDocumentHtml = editorHtml || generatedContent || "";
  const hasUnsavedChanges = !!currentDocumentHtml && currentDocumentHtml !== savedEditorHtml;

  // ── Editor View (after generation) ──
  if (generatedContent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Top Bar */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetChat} className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" /> New Draft
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {templateId ? TEMPLATE_LABELS[templateId] || templateId : "Document"}
              </span>
              <Badge variant="default" className="text-[11px] gap-1 px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowRefineChat(!showRefineChat); setShowFields(false); }}
              className="gap-1.5 text-xs hidden lg:flex"
              title={showRefineChat ? "Hide AI chat" : "Show AI chat"}
            >
              {showRefineChat ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
              AI Refine
            </Button>
            {Object.keys(editableFields).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowFields(!showFields); setShowRefineChat(false); }}
                className="gap-1.5 text-xs hidden lg:flex"
                title={showFields ? "Hide fields" : "Show fields"}
              >
                <Pencil className="h-3.5 w-3.5" />
                Fields
              </Button>
            )}
            <Separator orientation="vertical" className="h-5" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDocument}
              disabled={!currentDocumentHtml.trim() || documentSaving}
              className="gap-1.5 text-xs"
              title="Save document to your account"
            >
              {documentSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
            </Button>
            <Button variant="ghost" size="sm" onClick={copyContent} className="gap-1.5 text-xs" title="Copy to clipboard">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePrint} className="gap-1.5 text-xs" title="Print / Save as PDF">
              <Printer className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => exportEditorAsDocx(editorHtml || generatedContent || "", docTitle)}
              className="gap-1.5 text-xs"
              title="Download as Word document"
            >
              <FileDown className="h-3.5 w-3.5" /> Export DOCX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyShareLink}
              disabled={!currentDocumentHtml.trim() || copyingShareLink}
              className="gap-1.5 text-xs"
              title="Copy a public editing link"
            >
              {copyingShareLink ? "Preparing link..." : "Share Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!emailSubject) setEmailSubject(templateId ? TEMPLATE_LABELS[templateId] || docTitle : docTitle);
                setShowEmailDialog(true);
              }}
              className="gap-1.5 text-xs"
              title="Send document with Gmail"
            >
              <Mail className="h-3.5 w-3.5" /> Gmail
            </Button>
          </div>
        </div>

        {/* Pending Edit Review Banner */}
        <AnimatePresence>
          {pendingEdit && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="overflow-hidden rounded-xl border border-border bg-background shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    AI Edit: &ldquo;{pendingEdit.instruction}&rdquo;
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={acceptEdit}
                    className="gap-1.5 text-xs h-7 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <CheckCheck className="h-3 w-3" /> Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rejectEdit}
                    className="gap-1.5 text-xs h-7 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </div>
              </div>
              <ScrollArea className="max-h-64">
                <div className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                  {(() => {
                    // Strip HTML tags for readable word diff
                    const strip = (h: string) => {
                      const d = document.createElement("div");
                      d.innerHTML = h;
                      return d.textContent || d.innerText || "";
                    };
                    const oldText = strip(pendingEdit.oldContent);
                    const newText = strip(pendingEdit.newContent);
                    const parts = diffWords(oldText, newText);
                    return parts.map((part, i) => {
                      if (part.added) {
                        return (
                          <span key={i} className="bg-primary/15 text-primary px-0.5 rounded-sm">
                            {part.value}
                          </span>
                        );
                      }
                      if (part.removed) {
                        return (
                          <span key={i} className="bg-primary/10 text-primary line-through px-0.5 rounded-sm opacity-70">
                            {part.value}
                          </span>
                        );
                      }
                      return <span key={i}>{part.value}</span>;
                    });
                  })()}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div
          className="flex flex-col gap-3 lg:flex-row"
          style={{
            minHeight: pendingEdit ? "calc(100vh - 380px)" : "calc(100vh - 140px)",
          }}
        >
          {/* Left: Refinement Chat Panel */}
          {showRefineChat && (
            <motion.div
              initial={{ opacity: 0, x: -16, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: -16, width: 0 }}
              className="hidden shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:flex lg:flex-col"
            >
              <div className="border-b border-border px-4 py-3 bg-accent/20">
                <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Refine with AI
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {refineMessages.length === 0 && (
                    <div className="text-center py-6 space-y-2">
                      <Bot className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-xs text-muted-foreground">
                        Ask me to modify the document. For example:
                      </p>
                      <div className="space-y-1.5">
                        {["Add a termination clause", "Change the notice period to 60 days", "Make the language simpler and clearer"].map((s) => (
                          <button
                            key={s}
                            onClick={() => { setRefineInput(s); }}
                            className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {refineMessages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}
                    >
                      {m.role === "assistant" && (
                        <div className="shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm"
                      }`}>
                        {m.content}
                      </div>
                    </motion.div>
                  ))}
                  {refining && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                      <div className="shrink-0 h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                      <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2">
                        <div className="flex gap-1">
                          {[0, 0.15, 0.3].map((delay) => (
                            <motion.div
                              key={delay}
                              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={refineScrollRef} />
                </div>
              </ScrollArea>
              <div className="border-t border-border p-2.5 shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleRefine(); }}
                  className="flex gap-1.5"
                >
                  <Input
                    placeholder={pendingEdit ? "Accept or reject the pending edit first..." : "e.g., Add an indemnity clause..."}
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    className="text-xs rounded-lg h-8"
                    disabled={refining || !!pendingEdit}
                  />
                  <Button type="submit" size="icon" disabled={refining || !!pendingEdit || !refineInput.trim()} className="rounded-lg h-8 w-8 shrink-0">
                    <Send className="h-3 w-3" />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Left: Fields Panel (togglable) */}
          {showFields && Object.keys(editableFields).length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -16, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: -16, width: 0 }}
              className="hidden shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:flex lg:flex-col"
            >
              <div className="border-b border-border px-4 py-3 bg-accent/20">
                <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <Pencil className="h-3 w-3" /> Document Fields
                </h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2.5">
                  {Object.entries(editableFields).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        {key.replace(/_/g, " ")}
                      </label>
                      {val.length > 60 ? (
                        <Textarea
                          value={val}
                          onChange={(e) => {
                            setEditableFields((f) => ({ ...f, [key]: e.target.value }));
                          }}
                          rows={2}
                          className="text-xs resize-none rounded-lg"
                        />
                      ) : (
                        <Input
                          value={val}
                          onChange={(e) => {
                            setEditableFields((f) => ({ ...f, [key]: e.target.value }));
                          }}
                          className="text-xs rounded-lg h-8"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {/* Right: Rich Text Editor */}
          <div className={`flex-1 overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-500 ${
            editorFlash ? "border-primary ring-2 ring-primary/20" : "border-border"
          }`}>
            {editorFlash && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 bg-primary/5 pointer-events-none z-10 rounded-xl"
              />
            )}
            <LegalEditor
              content={currentDocumentHtml}
              onChange={(html) => setEditorHtml(html)}
            />
          </div>
        </div>

        <div className="sticky bottom-2 z-20 mt-2 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDocument}
            disabled={!currentDocumentHtml.trim() || documentSaving}
            className="flex-1 gap-1.5 text-xs"
          >
            {documentSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => exportEditorAsDocx(editorHtml || generatedContent || "", docTitle)}
            className="flex-1 gap-1.5 text-xs"
          >
            <FileDown className="h-3.5 w-3.5" /> DOCX
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyShareLink}
            disabled={!currentDocumentHtml.trim() || copyingShareLink}
            className="flex-1 gap-1.5 text-xs"
          >
            {copyingShareLink ? "Preparing..." : "Share Link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!emailSubject) setEmailSubject(templateId ? TEMPLATE_LABELS[templateId] || docTitle : docTitle);
              setShowEmailDialog(true);
            }}
            className="flex-1 gap-1.5 text-xs"
          >
            <Mail className="h-3.5 w-3.5" /> Gmail
          </Button>
        </div>

        {/* Email Dialog */}
        <AnimatePresence>
          {showEmailDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setShowEmailDialog(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="mx-4 w-full max-w-lg"
              >
                <Card className="shadow-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-base">Send with Gmail</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowEmailDialog(false)}>
                        <span className="text-lg leading-none">&times;</span>
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      Send this document directly to your client with LexHelm mail delivery.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">To (client email) *</label>
                      <Input
                        placeholder="client@example.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Separate multiple emails with commas</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">CC (optional)</label>
                      <Input
                        placeholder="colleague@firm.com"
                        value={emailCc}
                        onChange={(e) => setEmailCc(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Subject</label>
                      <Input
                        placeholder="Document for your review"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Note (optional)</label>
                      <Textarea
                        placeholder="Please review the attached document and let me know if you have any questions..."
                        value={emailNote}
                        onChange={(e) => setEmailNote(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleEmailSend}
                        disabled={emailSending || !emailTo.trim()}
                        className="gap-2 flex-1"
                      >
                        {emailSending ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                          />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        {emailSending ? "Sending..." : "Send Document"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  if (showRentalIntake && !generatedContent) {
    return (
      <RentalAgreementIntake
        generating={sending}
        onGenerate={handleRentalAgreementGenerate}
        onCancel={() => {
          if (!sending) {
            setShowRentalIntake(false);
          }
        }}
      />
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
          <CardHeader className="bg-background">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">What document do you need?</CardTitle>
            </div>
            <CardDescription>
              Tell me what you need in plain English — for example, &ldquo;I&apos;m renting out my flat in Mumbai&rdquo;. I&apos;ll ask for any missing details, then open a full editor for you to review and refine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Need a rental agreement?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the guided checklist with stamp-paper options, reference formats, and all major lease fields instead of the generic bot input.
                  </p>
                </div>
                <Button
                  className="rounded-xl"
                  onClick={() => setShowRentalIntake(true)}
                >
                  Open Rental Intake
                </Button>
              </div>
            </div>
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
                    variant="ghost"
                    size="sm"
                    className="rounded-lg border border-border bg-white text-xs text-foreground hover:bg-[#F3F5FA] hover:text-foreground"
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
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Chat column */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border" style={{ minHeight: "calc(100vh - 290px)" }}>
        {/* Chat header */}
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between shrink-0 bg-accent/20">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-foreground" />
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
              <Sparkles className="h-4 w-4" />
              Generate Document
            </Button>
          </div>
        )}

        {/* Input */}
        {phase !== "done" && (
          <div className="border-t border-border p-3 shrink-0">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row"
            >
              <Textarea
                placeholder={phase === "confirm" ? "Want to change anything? Or click Generate Document..." : "Type your response..."}
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
              <Button type="submit" size="icon" disabled={sending || !input.trim()} className="h-11 w-11 shrink-0 rounded-xl self-end sm:self-auto">
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
          className="hidden w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border border-border p-5 lg:block"
          style={{ minHeight: "calc(100vh - 290px)" }}
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

function SavedDocumentsTab({ loading, sessions, onOpen, onDelete }: {
  loading: boolean;
  sessions: DraftChatSessionSummary[];
  onOpen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No saved documents yet. Generate a document and it will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <Card
          key={session.session_id}
          className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group"
          onClick={() => onOpen(session.session_id)}
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <CardTitle>{session.template_id ? (TEMPLATE_LABELS[session.template_id] || session.template_id) : "Saved Document"}</CardTitle>
                  <CardDescription>Saved on {new Date(session.created_at).toLocaleDateString()}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  {session.status}
                </Badge>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.session_id); }}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-primary/10 text-primary hover:text-primary"
                  title="Delete document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Open this draft to review, edit, and save changes at any time.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ───────── Templates Tab ───────── */
function TemplatesTab({ templates, onChatWithTemplate }: {
  templates: Template[];
  onChatWithTemplate: (templateId: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((t, i) => (
        <motion.div
          key={t.template_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{TEMPLATE_ICONS[t.template_id] || "📄"}</span>
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors">{t.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{t.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
              {t.template_id === "rental_agreement" && (
                <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground">
                  Includes guided intake, stamp options for Rs.10, Rs.20, Rs.50, Rs.100, and reference formats for residential, room, house, and commercial leases.
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {t.required_fields.slice(0, 4).map((p) => (
                  <Badge key={p} variant="default" className="text-[11px]">{p.replace(/_/g, " ")}</Badge>
                ))}
                {t.required_fields.length > 4 && (
                  <Badge variant="secondary" className="text-[11px]">+{t.required_fields.length - 4} more</Badge>
                )}
              </div>
              <Button size="sm" onClick={() => onChatWithTemplate(t.template_id)} className="gap-1.5 rounded-lg w-full mt-2">
                <Wand2 className="h-3.5 w-3.5" /> Draft with AI
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
        <CardHeader className="bg-background">
          <CardTitle className="text-base">Analyze an Existing Document</CardTitle>
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
                  <span key={fmt} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
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
