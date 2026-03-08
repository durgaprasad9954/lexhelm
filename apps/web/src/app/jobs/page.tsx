"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase, Play, RefreshCw, Clock, CheckCircle, XCircle, Loader2,
  Search, FileText, BookOpen, Scale, Landmark, Gavel, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { submitJob, getJob, listJobs, type Job } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const JOB_TYPES = [
  {
    id: "deep_search",
    label: "Deep Search",
    icon: Search,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    desc: "Searches multiple pages of Indian case law and compiles a ranked summary of the most relevant judgments, statutes, and legal provisions.",
    output: "Ranked list of cases with citations, court names, dates, and relevance snippets.",
    examples: [
      "Tenant eviction rights under rent control",
      "Section 138 NI Act cheque bounce defences",
      "Arbitration clause unilateral appointment",
    ],
  },
  {
    id: "research",
    label: "Research Memo",
    icon: BookOpen,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    desc: "Performs comprehensive legal research and produces a structured memo with analysis, applicable statutes, leading cases, and practical recommendations.",
    output: "Full research memo with headings, case citations, statutory references, and conclusion.",
    examples: [
      "IP infringement remedies for software patents in India",
      "FEMA compliance for outward remittance by NRIs",
      "Employee termination notice period requirements",
    ],
  },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listJobs(50)
      .then((r) => setJobs(r.jobs))
      .catch(() => toast.error("Failed to load jobs"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll selected job if in progress
  useEffect(() => {
    if (!selectedJob || !["pending", "running"].includes(selectedJob.status)) return;
    const interval = setInterval(async () => {
      try {
        const j = await getJob(selectedJob.id);
        setSelectedJob(j);
        if (!["pending", "running"].includes(j.status)) {
          refresh();
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedJob, refresh]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-rose-500/5 to-pink-500/5 px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Research Jobs</h1>
              <p className="text-sm text-muted-foreground">Submit deep legal research queries that run in the background and produce detailed results.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </motion.div>
      </div>

      <div className="p-6 md:p-10 space-y-6">
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="submit" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Play className="h-3.5 w-3.5" /> New Job
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Briefcase className="h-3.5 w-3.5" /> History ({jobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SubmitTab onSubmitted={(j) => { setJobs((prev) => [j, ...prev]); setSelectedJob(j); }} />
            </motion.div>
          </TabsContent>

          <TabsContent value="history">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-18 rounded-xl" />)}
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <Briefcase className="h-7 w-7 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No jobs yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Submit a research task to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((j, i) => (
                    <motion.div
                      key={j.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                    >
                      <JobCard job={j} onClick={() => setSelectedJob(j)} selected={selectedJob?.id === j.id} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Job detail */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Separator className="mb-6" />
              <JobDetail job={selectedJob} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SubmitTab({ onSubmitted }: { onSubmitted: (j: Job) => void }) {
  const [jobType, setJobType] = useState("deep_search");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedType = JOB_TYPES.find((t) => t.id === jobType) || JOB_TYPES[0];

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setSubmitting(true);
    try {
      const j = await submitJob(jobType, { query });
      toast.success(`Job submitted: ${j.id.slice(0, 8)}...`);
      onSubmitted(j);
      setQuery("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job type cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Choose job type</p>
        <div className="grid gap-3 md:grid-cols-2">
          {JOB_TYPES.map((type, i) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <button
                onClick={() => setJobType(type.id)}
                className="w-full text-left"
              >
                <Card className={`transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  jobType === type.id ? "border-primary shadow-md ring-1 ring-primary/20" : "hover:border-primary/20"
                }`}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl ${type.bg} flex items-center justify-center shrink-0`}>
                        <type.icon className={`h-5 w-5 ${type.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{type.label}</p>
                          {jobType === type.id && (
                            <Badge variant="default" className="text-[11px] px-1.5 py-0">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{type.desc}</p>
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">Output</p>
                      <p className="text-xs text-foreground/70">{type.output}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Query input */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Research Query</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={selectedType.examples[0]}
              className="h-11 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Example queries */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {selectedType.examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setQuery(ex)}
                  className="text-xs text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !query.trim()} className="gap-2 h-10">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {submitting ? "Submitting..." : `Run ${selectedType.label}`}
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-rose-500/5 to-pink-500/5 border-rose-500/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-rose-500" />
            <p className="text-sm font-semibold text-foreground">How research jobs work</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { step: "1", icon: Gavel, title: "Submit your query", desc: "Describe the legal topic, question, or scenario you need researched." },
              { step: "2", icon: Search, title: "AI researches in background", desc: "The system searches case law, statutes, and legal databases — takes 2\u20135 minutes." },
              { step: "3", icon: FileText, title: "Get structured results", desc: "Receive a detailed memo or ranked case list with citations you can use directly." },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-rose-500">{s.step}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JobCard({ job, onClick, selected }: { job: Job; onClick: () => void; selected: boolean }) {
  const statusConfig = {
    pending: { icon: <Clock className="h-3.5 w-3.5" />, variant: "secondary" as const, color: "text-muted-foreground" },
    running: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, variant: "default" as const, color: "text-blue-500" },
    completed: { icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" as const, color: "text-emerald-500" },
    failed: { icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive" as const, color: "text-destructive" },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        selected ? "border-primary shadow-md" : "hover:border-primary/20"
      }`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 py-3.5">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
          job.status === "completed" ? "bg-emerald-500/10" :
          job.status === "failed" ? "bg-destructive/10" :
          job.status === "running" ? "bg-blue-500/10" :
          "bg-muted"
        }`}>
          <span className={config.color}>{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {job.job_type}: {(job.input_params as Record<string, string>).query || "\u2014"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            {job.progress != null && ` \u00b7 ${job.progress}%`}
          </p>
        </div>
        <Badge variant={config.variant} className="gap-1 text-xs">
          {config.icon}
          {job.status}
        </Badge>
        <code className="text-[11px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">{job.id.slice(0, 8)}</code>
      </CardContent>
    </Card>
  );
}

function JobDetail({ job }: { job: Job }) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            job.status === "completed" ? "bg-emerald-500/10" :
            job.status === "failed" ? "bg-destructive/10" :
            "bg-muted"
          }`}>
            {job.status === "completed" ? <CheckCircle className="h-5 w-5 text-emerald-500" /> :
             job.status === "failed" ? <XCircle className="h-5 w-5 text-destructive" /> :
             <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
          </div>
          <div>
            <CardTitle className="text-base">Job: {job.id.slice(0, 8)}...</CardTitle>
            <CardDescription>
              {job.job_type} &middot; Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              {job.completed_at && ` \u00b7 Completed ${formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}`}
            </CardDescription>
          </div>
          <Badge
            variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
            className="ml-auto text-xs"
          >
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.progress != null && ["pending", "running"].includes(job.status) && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium">Progress</span>
              <span className="font-semibold text-primary">{job.progress}%</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>
        )}

        {job.error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {job.error}
          </div>
        )}

        {job.result && (
          <div className="space-y-4">
            {typeof (job.result as Record<string, unknown>).summary === "string" && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(job.result as Record<string, string>).summary}
                </ReactMarkdown>
              </div>
            )}
            {typeof (job.result as Record<string, unknown>).memo === "string" && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {(job.result as Record<string, string>).memo}
                </ReactMarkdown>
              </div>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground font-medium hover:text-foreground transition-colors">
                Raw result JSON
              </summary>
              <pre className="mt-2 whitespace-pre-wrap bg-accent/30 p-4 rounded-xl overflow-x-auto font-mono text-foreground/80">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
