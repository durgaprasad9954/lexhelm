"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LegalEditor } from "@/components/editor/legal-editor";
import { API_BASE, API_TOKEN } from "@/lib/api";

interface PublicDraftSession {
  session_id: string;
  phase: string;
  template_id: string | null;
  generated_content: string | null;
}

export default function PublicDraftDocumentPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<PublicDraftSession | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/draft-chat/${sessionId}`, {
          headers: { "X-API-TOKEN": API_TOKEN },
        });
        if (!res.ok) {
          throw new Error("Failed to load document");
        }
        const data = await res.json();
        if (cancelled) return;
        const nextContent = data.generated_content || "";
        setSession(data);
        setContent(nextContent);
        setSavedContent(nextContent);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const saveDocument = async () => {
    if (!session || saving || content === savedContent) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/draft-chat/${sessionId}/content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-TOKEN": API_TOKEN,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        throw new Error("Failed to save document");
      }
      const data = await res.json();
      const nextContent = data.generated_content || content;
      setSession((prev) => prev ? { ...prev, generated_content: nextContent, phase: data.phase } : prev);
      setContent(nextContent);
      setSavedContent(nextContent);
      toast.success("Document saved");
    } catch {
      toast.error("Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lexhelm-document.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Document not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This link may be invalid or the document is no longer available.
            </p>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              Go to LexHelm
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasUnsavedChanges = content !== savedContent;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">LexHelm Document</p>
              <p className="text-sm text-muted-foreground">Open, edit, save, and download</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? <Badge variant="outline">Unsaved changes</Badge> : null}
            <Button variant="outline" onClick={downloadDocument} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={saveDocument} disabled={!hasUnsavedChanges || saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <LegalEditor content={content} onChange={setContent} />
        </div>
      </div>
    </div>
  );
}
