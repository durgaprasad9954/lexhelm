"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, MessageSquare, Search,
  ArrowRight, Scale, Sparkles, BookOpen, Shield, Landmark,
  FileSearch, Upload, Wand2, Clock, Zap, Home, Users,
} from "lucide-react";
import { listDocSessions } from "@/lib/api";
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
  const router = useRouter();
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
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

  const helpItems = [
    {
      icon: FileSearch,
      title: "Find relevant case law in seconds",
      desc: "Ask a question in chat and review case-backed answers with linked search results.",
      prompt: "What are a tenant's eviction rights in India?",
    },
    {
      icon: Shield,
      title: "Analyze contracts for risks",
      desc: "Upload any agreement and ask AI to identify risky clauses, missing terms, or obligations.",
      href: "/doc-chat",
    },
    {
      icon: BookOpen,
      title: "Draft legal documents with AI",
      desc: "Describe what you need in plain English. AI collects details and generates a ready-to-edit document.",
      href: "/documents",
    },
    {
      icon: Landmark,
      title: "Open your generated documents separately",
      desc: "Saved documents stay in the dedicated documents area so you can reopen and continue editing anytime.",
      href: "/documents?tab=saved",
    },
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
          <div className="mb-1 flex items-center justify-between">
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
              <Link href={f.href} className="block h-full">
                <Card className="group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <CardHeader className="relative pb-2">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                        <f.icon className={`h-5 w-5 ${f.iconColor}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                          {f.title}
                          <ArrowRight className="h-3.5 w-3.5 -translate-x-2 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                        </CardTitle>
                        <CardDescription className="mt-1 text-sm">{f.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-4 pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {f.examples.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            router.push(buildSearchHref(ex));
                          }}
                          className="inline-flex cursor-pointer rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-white"
                        >
                          {ex}
                        </button>
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
                <div className="grid gap-3 md:grid-cols-2">
                  {helpItems.map((item) => {
                    const content = (
                      <div className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/25 hover:bg-accent/35">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    );

                    return item.prompt ? (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => router.push(buildSearchHref(item.prompt!))}
                        className="cursor-pointer text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <Link key={item.title} href={item.href!} className="block">
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
      </div>
    </div>
  );
}
