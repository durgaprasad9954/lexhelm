"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, Users, Clock, CheckCircle, XCircle, BarChart3,
  RefreshCw, Loader2, Mail, Building2, FileText, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  getAdminMetrics,
  listBetaRequests,
  reviewBetaRequest,
  type BetaRequestData,
  type MetricsSummary,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [requests, setRequests] = useState<BetaRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        getAdminMetrics(),
        listBetaRequests(filter),
      ]);
      setMetrics(m);
      setRequests(r);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Wait for auth to be ready before fetching admin data
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      refresh();
    }
  }, [authLoading, isAuthenticated, refresh]);

  const handleReview = async (id: string, status: "approved" | "rejected") => {
    try {
      const updated = await reviewBetaRequest(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success(`Request ${status}`);
      // Refresh metrics
      getAdminMetrics().then(setMetrics).catch(() => {});
    } catch {
      toast.error("Failed to update request");
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-cyan-500/5 to-blue-500/5 px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage beta requests, track metrics, and monitor usage.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </motion.div>
      </div>

      <div className="p-6 md:p-10 space-y-6">
        {/* Metric Cards */}
        {loading && !metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Total Users"
              value={metrics.total_users}
              color="blue"
            />
            <MetricCard
              icon={<FileText className="h-4 w-4" />}
              label="Beta Requests"
              value={metrics.total_beta_requests}
              color="violet"
            />
            <MetricCard
              icon={<Clock className="h-4 w-4" />}
              label="Pending"
              value={metrics.pending_requests}
              color="amber"
            />
            <MetricCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="API Events"
              value={metrics.total_api_requests}
              color="emerald"
            />
          </div>
        ) : null}

        {/* Approval bar */}
        {metrics && metrics.total_beta_requests > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Approval Rate</span>
                <span className="font-semibold text-foreground">
                  {Math.round((metrics.approved_requests / metrics.total_beta_requests) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(metrics.approved_requests / metrics.total_beta_requests) * 100}%` }}
                />
                <div
                  className="h-full bg-destructive transition-all duration-500"
                  style={{ width: `${(metrics.rejected_requests / metrics.total_beta_requests) * 100}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {metrics.approved_requests} approved</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> {metrics.rejected_requests} rejected</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground" /> {metrics.pending_requests} pending</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requests Table */}
        <Tabs defaultValue="all" onValueChange={(v) => setFilter(v === "all" ? undefined : v)}>
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BarChart3 className="h-3.5 w-3.5" /> All
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Clock className="h-3.5 w-3.5" /> Pending
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <CheckCircle className="h-3.5 w-3.5" /> Approved
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </TabsTrigger>
            </TabsList>
            <span className="text-xs text-muted-foreground">{requests.length} requests</span>
          </div>

          {["all", "pending", "approved", "rejected"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <FileText className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No requests found.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                      >
                        <RequestCard request={req} onReview={handleReview} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "blue" | "violet" | "amber" | "emerald";
}) {
  const colors = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
    violet: { bg: "bg-violet-500/10", text: "text-violet-500" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  };
  const c = colors[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
              <span className={c.text}>{icon}</span>
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RequestCard({
  request,
  onReview,
}: {
  request: BetaRequestData;
  onReview: (id: string, status: "approved" | "rejected") => void;
}) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  const handleAction = async (status: "approved" | "rejected") => {
    setLoading(status);
    await onReview(request.id, status);
    setLoading(null);
  };

  const statusConfig = {
    pending: { icon: <Clock className="h-3.5 w-3.5" />, variant: "secondary" as const, color: "text-amber-500", bg: "bg-amber-500/10" },
    approved: { icon: <CheckCircle className="h-3.5 w-3.5" />, variant: "default" as const, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    rejected: { icon: <XCircle className="h-3.5 w-3.5" />, variant: "destructive" as const, color: "text-destructive", bg: "bg-destructive/10" },
  };
  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={`h-9 w-9 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
            <span className={config.color}>{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">{request.email}</span>
              </div>
              <Badge variant={config.variant} className="gap-1 text-[10px]">
                {config.icon}
                {request.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {request.name && <span>{request.name}</span>}
              {request.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {request.company}
                </span>
              )}
              <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
              {request.referrer && <span className="text-primary/60">from {request.referrer}</span>}
            </div>
            {request.use_case && (
              <p className="text-xs text-muted-foreground mt-2 bg-accent/30 rounded-lg p-2 line-clamp-2">
                {request.use_case}
              </p>
            )}
            {request.reviewed_by && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Reviewed by {request.reviewed_by}
                {request.reviewed_at && ` · ${formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}`}
              </p>
            )}
          </div>
          {request.status === "pending" && (
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                onClick={() => handleAction("approved")}
                disabled={loading !== null}
              >
                {loading === "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                onClick={() => handleAction("rejected")}
                disabled={loading !== null}
              >
                {loading === "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
