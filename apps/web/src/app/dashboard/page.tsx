"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, MessageSquare, Search, Briefcase, Activity,
  ArrowRight, Scale, Gavel, BookOpen, Shield, Landmark,
  FileSearch, Upload, Wand2, Play,
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
      desc: "Search 100M+ Indian legal documents — Supreme Court, High Courts, Tribunals, statutes & case law.",
      href: "/search",
      color: "from-violet-500/10 to-purple-500/10",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
      examples: ["Tenant eviction rights", "Section 498A dowry", "Bail conditions"],
    },
    {
      icon: MessageSquare,
      title: "Doc Chat",
      desc: `Upload contracts, agreements, or legal docs and ask AI questions about them.${docCount > 0 ? ` ${docCount} active sessions.` : ""}`,
      href: "/doc-chat",
      color: "from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      examples: ["Summarize key terms", "Find risky clauses", "Compare obligations"],
    },
    {
      icon: FileText,
      title: "Document Drafting",
      desc: "Generate rental agreements, NDAs, service agreements & more with AI-guided field collection.",
      href: "/documents",
      color: "from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      examples: ["Rental agreement", "NDA for vendor", "Legal notice"],
    },
    {
      icon: Briefcase,
      title: "Research Jobs",
      desc: `Submit deep legal research queries that run in the background and produce detailed memos.${jobCount > 0 ? ` ${jobCount} jobs.` : ""}`,
      href: "/jobs",
      color: "from-rose-500/10 to-pink-500/10",
      iconColor: "text-rose-500",
      iconBg: "bg-rose-500/10",
      examples: ["Rent control tenant rights", "IP infringement remedies", "FEMA compliance"],
    },
  ];

  const quickActions = [
    { icon: Search, label: "Search a case", href: "/search", color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Upload, label: "Upload a document", href: "/doc-chat", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Wand2, label: "Draft an agreement", href: "/documents", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Play, label: "Run a research job", href: "/jobs", color: "text-rose-500", bg: "bg-rose-500/10" },
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
                <p className="text-sm text-muted-foreground/90 mt-0.5">
                  AI-powered legal research, document drafting & contract analysis for Indian law
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative mt-6 flex flex-wrap gap-3"
        >
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-background/80 hover:bg-accent/50 hover:border-primary/20 transition-all text-sm cursor-pointer group">
                <div className={`h-6 w-6 rounded-md ${a.bg} flex items-center justify-center`}>
                  <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                </div>
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">{a.label}</span>
              </div>
            </Link>
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
                <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 h-full">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <CardHeader className="relative pb-2">
                    <div className="flex items-start gap-4">
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
                    </div>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {f.examples.map((ex) => (
                        <span key={ex} className="text-[11px] font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* What you can do */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">What can LexHelm do for you?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSearch className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Find relevant case law in seconds</p>
                      <p className="text-xs text-muted-foreground">Search across Supreme Court, High Courts & Tribunals with AI-ranked relevance.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Analyze contracts for risks</p>
                      <p className="text-xs text-muted-foreground">Upload any agreement and ask AI to identify risky clauses, missing terms, or obligations.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Draft legal documents with AI</p>
                      <p className="text-xs text-muted-foreground">Describe what you need in plain English. AI collects details and generates a ready-to-edit document.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-rose-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Landmark className="h-3.5 w-3.5 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Deep legal research memos</p>
                      <p className="text-xs text-muted-foreground">Submit complex queries and get comprehensive research memos with citations.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
