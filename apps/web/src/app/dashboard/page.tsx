"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, MessageSquare, Search, Briefcase, Activity,
  ArrowRight, Sparkles, Scale, TrendingUp,
} from "lucide-react";
import { healthCheck, listDocSessions, listJobs } from "@/lib/api";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [docCount, setDocCount] = useState(0);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
    listDocSessions(100)
      .then((r) => setDocCount(r.sessions.length))
      .catch(() => {});
    listJobs(100)
      .then((r) => setJobCount(r.jobs.length))
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: Search,
      title: "Case Search",
      desc: "Search Indian legal cases, statutes, and judgments via IndianKanoon.",
      href: "/search",
      color: "from-violet-500/10 to-purple-500/10",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
    },
    {
      icon: MessageSquare,
      title: "Doc Chat",
      desc: `Upload documents and chat with AI. ${docCount} active sessions.`,
      href: "/doc-chat",
      color: "from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      icon: FileText,
      title: "Document Drafting",
      desc: "Generate legal agreements from templates or natural language.",
      href: "/documents",
      color: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      icon: Briefcase,
      title: "Research Jobs",
      desc: `Submit deep research tasks that run asynchronously. ${jobCount} jobs.`,
      href: "/jobs",
      color: "from-rose-500/10 to-pink-500/10",
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-background to-violet-500/5 px-6 py-10 md:px-10 md:py-14">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.45 0.15 280 / 0.1) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                  Welcome to LexHelm
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Your AI-powered legal intelligence platform
                </p>
              </div>
            </div>
            <Badge
              variant={apiStatus === "online" ? "default" : apiStatus === "offline" ? "destructive" : "secondary"}
              className="gap-1.5"
            >
              <Activity className="h-3 w-3" />
              API {apiStatus}
            </Badge>
          </div>
        </motion.div>

        {/* Trust metrics */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative mt-6 flex flex-wrap gap-6"
        >
          {[
            { icon: TrendingUp, label: "10x Faster Research", color: "text-emerald-500" },
            { icon: Sparkles, label: "AI-Powered Analysis", color: "text-violet-500" },
            { icon: Activity, label: "Real-time Processing", color: "text-blue-500" },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
              <span className="font-medium">{m.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Feature Cards */}
      <div className="p-6 md:p-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          {features.map((f) => (
            <motion.div key={f.href} variants={item}>
              <Link href={f.href} className="block group">
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <CardHeader className="relative flex flex-row items-start gap-4 pb-2">
                    <div className={`h-10 w-10 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                      <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        {f.title}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">{f.desc}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Quick Start Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Case Search</strong> — Search IndianKanoon for legal cases, statutes, and judgments.</p>
              <p><strong className="text-foreground">Doc Chat</strong> — Upload a document (PDF, DOCX, TXT) and chat with it using AI.</p>
              <p><strong className="text-foreground">Drafting</strong> — Generate legal agreements from templates or natural language descriptions.</p>
              <p><strong className="text-foreground">Jobs</strong> — Submit deep research tasks that run asynchronously.</p>
              <p className="text-xs mt-3 pt-3 border-t border-border/50">
                Use short tags like <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">#case:123</code>,{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">#doc:abc</code>,{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-[11px]">#job:xyz</code> to link to resources.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
