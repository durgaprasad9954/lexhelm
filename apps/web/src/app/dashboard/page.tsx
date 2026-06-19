"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, MessageSquare, Search, Activity,
  ArrowRight, Scale, Sparkles, BookOpen, Shield, Landmark,
  FileSearch, Upload, Wand2, Clock, Zap, Home, Users,
} from "lucide-react";
import { healthCheck, listDocSessions } from "@/lib/api";
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

function buildSearchHref(prompt: string) {
  return `/search?prompt=${encodeURIComponent(prompt)}`;
}

export default function DashboardPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    healthCheck()
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
    listDocSessions(100)
      .then((r) => setDocCount(r.sessions.length))
      .catch(() => {});
  }, []);

  const features = [
    {
      icon: Search,
      title: "Legal Search Chat",
      desc: "Ask a legal question in chat and get an LLM-generated answer grounded in Indian case law and legal search results.",
      href: "/search",
      color: "from-primary/8 to-primary/4",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      examples: ["Employee termination rules", "Tenant eviction rights", "Startup investor agreements"],
    },
    {
      icon: MessageSquare,
      title: "Review Document",
      desc: `Upload any contract or agreement and ask questions in plain English.${docCount > 0 ? ` ${docCount} active sessions.` : ""}`,
      href: "/doc-chat",
      color: "from-primary/8 to-primary/4",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      examples: ["Summarize this contract", "Are there any red flags?", "What if I cancel early?"],
    },
    {
      icon: FileText,
      title: "Create Documents",
      desc: "Describe what you need and the AI will create a ready-to-use legal document for you.",
      href: "/documents",
      color: "from-primary/8 to-primary/4",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      examples: ["Rental agreement", "NDA for vendor", "Employment offer letter"],
    },
  ];

  const quickActions = [
    { icon: Search, label: "Ask a legal question", href: "/search", color: "text-primary", bg: "bg-primary/10" },
    { icon: Upload, label: "Review a contract", href: "/doc-chat", color: "text-primary", bg: "bg-primary/10" },
    { icon: Home, label: "Instant lease agreement", href: "/documents?template=rental_agreement&feature=instant-lease", color: "text-primary", bg: "bg-primary/10" },
    { icon: Wand2, label: "Create documents", href: "/documents", color: "text-primary", bg: "bg-primary/10" },
    { icon: Users, label: "Start Consultation", href: "/consultation", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="min-h-full bg-white">
      <div className="relative overflow-hidden border-b border-border bg-background px-6 py-10 md:px-10 md:py-14">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(65, 92, 164, 0.14) 1px, transparent 0)`,
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
                  Create legal documents, review contracts, and ask legal questions in one workspace
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

      <div className="bg-white p-6 md:p-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 md:grid-cols-2"
        >
          <motion.div variants={item} className="md:col-span-2">
            <Link href="/documents?template=rental_agreement&feature=instant-lease" className="block group">
              <Card className="relative overflow-hidden border-primary/20 bg-background transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5">
                <CardContent className="relative p-5 md:p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                        <Home className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg font-semibold">
                            Instant Lease Agreement in Four Clicks
                          </CardTitle>
                          <Badge variant="secondary" className="gap-1 text-[11px]">
                            <Clock className="h-3 w-3" /> Fast track
                          </Badge>
                        </div>
                        <CardDescription className="mt-1 max-w-2xl text-sm">
                          Start a guided rental or lease agreement flow, collect landlord, tenant, property, rent, deposit, and term details, then generate a ready-to-edit document.
                        </CardDescription>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {["Rental agreement", "Lease terms", "Ready to edit"].map((ex) => (
                            <span key={ex} className="text-[11px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md">
                              {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary md:shrink-0">
                      <Zap className="h-4 w-4" />
                      Generate now
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

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
                        <Link key={ex} href={buildSearchHref(ex)}>
                          <span className="inline-flex text-[11px] font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md transition-colors hover:bg-primary hover:text-white">
                            {ex}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6"
        >
          <Card className="bg-card border-primary/15">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">How can LexHelm help you?</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileSearch className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Find relevant case law in seconds</p>
                      <p className="text-xs text-muted-foreground">Ask a question in chat and review case-backed answers with linked search results.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Analyze contracts for risks</p>
                      <p className="text-xs text-muted-foreground">Upload any agreement and ask AI to identify risky clauses, missing terms, or obligations.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Draft legal documents with AI</p>
                      <p className="text-xs text-muted-foreground">Describe what you need in plain English. AI collects details and generates a ready-to-edit document.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Landmark className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Open your generated documents separately</p>
                      <p className="text-xs text-muted-foreground">Saved documents stay in the dedicated documents area instead of the home dashboard.</p>
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
