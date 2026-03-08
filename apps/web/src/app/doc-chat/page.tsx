"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload, FileText, MessageSquare, Clock, CloudUpload, File,
  Shield, ListChecks, Scale, AlertTriangle, HelpCircle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { listDocSessions, uploadDocument, type DocSession } from "@/lib/api";

const CAPABILITIES = [
  { icon: ListChecks, label: "Summarize key terms & obligations", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: AlertTriangle, label: "Identify risky or unfavorable clauses", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Shield, label: "Check for missing standard protections", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: HelpCircle, label: "Ask any question about the document", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: Scale, label: "Compare terms against legal standards", color: "text-rose-500", bg: "bg-rose-500/10" },
];

export default function DocChatPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DocSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    listDocSessions()
      .then((r) => setSessions(r.sessions))
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const sess = await uploadDocument(file);
      toast.success(`Uploaded ${file.name}`);
      router.push(`/doc-chat/${sess.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  const statusColor = (s: string) =>
    s === "ready" ? "default" : s === "processing" ? "secondary" : "destructive";

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-emerald-500/5 to-teal-500/5 px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Chat</h1>
            <p className="text-sm text-muted-foreground">Upload contracts, agreements, or legal documents and chat with AI to analyze them.</p>
          </div>
        </motion.div>
      </div>

      <div className="p-6 md:p-10 space-y-8">
        {/* Upload zone + capabilities side by side */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid gap-6 lg:grid-cols-5"
        >
          {/* Upload zone */}
          <div className="lg:col-span-3">
            <div
              {...getRootProps()}
              className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 h-full flex items-center justify-center ${
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border/50 hover:border-primary/40 hover:bg-accent/30"
              } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${
                  isDragActive ? "bg-primary/10" : "bg-muted"
                }`}>
                  <CloudUpload className={`h-7 w-7 transition-colors duration-300 ${
                    isDragActive ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                {uploading ? (
                  <div className="space-y-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="mx-auto h-5 w-5 rounded-full border-2 border-primary border-t-transparent"
                    />
                    <p className="text-sm text-muted-foreground font-medium">Uploading & analyzing...</p>
                  </div>
                ) : isDragActive ? (
                  <p className="text-sm text-primary font-semibold">Drop the file here</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">Drag & drop a document, or click to select</p>
                    <p className="text-xs text-muted-foreground mt-1.5">PDF, DOCX, or TXT &mdash; max 10 MB</p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                      {["PDF", "DOCX", "TXT"].map((fmt) => (
                        <span key={fmt} className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                          <File className="h-3 w-3" />
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* Capabilities panel */}
          <div className="lg:col-span-2">
            <Card className="h-full border-border/50">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">What you can do</h3>
                  <p className="text-xs text-muted-foreground">After uploading, ask AI anything about your document:</p>
                </div>
                <div className="space-y-2.5">
                  {CAPABILITIES.map((cap, i) => (
                    <motion.div
                      key={cap.label}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                      className="flex items-center gap-2.5"
                    >
                      <div className={`h-7 w-7 rounded-md ${cap.bg} flex items-center justify-center shrink-0`}>
                        <cap.icon className={`h-3.5 w-3.5 ${cap.color}`} />
                      </div>
                      <span className="text-xs text-foreground/90">{cap.label}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Example: &ldquo;What is the termination clause?&rdquo;, &ldquo;Are there any auto-renewal terms?&rdquo;, &ldquo;Summarize the indemnity obligations.&rdquo;
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Sessions list */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Sessions
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-18 w-full rounded-xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Upload className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">No sessions yet. Upload a document above to get started.</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              <div className="space-y-2">
                {sessions.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    <Card
                      className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5"
                      onClick={() => router.push(`/doc-chat/${s.id}`)}
                    >
                      <CardContent className="flex items-center gap-4 py-3.5">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{s.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                            {s.byte_size && <span>&middot; {(s.byte_size / 1024).toFixed(0)} KB</span>}
                          </div>
                        </div>
                        <Badge variant={statusColor(s.status)} className="text-xs">{s.status}</Badge>
                        {s.message_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            <MessageSquare className="h-3 w-3" />
                            {s.message_count}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
