"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, ChevronLeft, ChevronRight, Scale, Sparkles } from "lucide-react";
import { searchCases, type SearchResult, type SearchResponse } from "@/lib/api";
import { Linkify } from "@/lib/linkify";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doSearch = async (p = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await searchCases(query, p);
      setResult(r);
      setPage(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const totalPages = result ? Math.ceil(result.total / result.page_size) : 0;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-violet-500/5 to-purple-500/5 px-6 py-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Case Search</h1>
              <p className="text-sm text-muted-foreground">Search Indian legal cases via IndianKanoon.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); doSearch(1); }}
            className="flex gap-2 max-w-2xl"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases, statutes, judgments..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50"
              />
            </div>
            <Button type="submit" disabled={loading || !query.trim()} className="h-11 px-6">
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                />
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>

      {/* Results */}
      <div className="p-6 md:p-10 space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Skeleton className="h-28 w-full rounded-xl" />
              </motion.div>
            ))}
          </div>
        )}

        {!result && !loading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
              <Scale className="h-8 w-8 text-primary/30" />
            </div>
            <p className="text-sm text-muted-foreground">
              Search for legal cases, statutes, and judgments to get started.
            </p>
          </motion.div>
        )}

        {result && !loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{result.total.toLocaleString()}</span> results &mdash; page {result.page} of {totalPages}
                </p>
              </div>

              <div className="space-y-3">
                {result.results.map((r, i) => (
                  <motion.div
                    key={`${r.doc_id}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  >
                    <CaseCard result={r} />
                  </motion.div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => doSearch(page - 1)} className="gap-1">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground font-medium px-3">
                    {page} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => doSearch(page + 1)} className="gap-1">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function CaseCard({ result }: { result: SearchResult }) {
  return (
    <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-medium leading-snug group-hover:text-primary transition-colors">
            <Linkify text={result.title} />
          </CardTitle>
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {result.headline && (
          <p className="text-sm text-muted-foreground line-clamp-2"
            dangerouslySetInnerHTML={{ __html: result.headline }} />
        )}
        <div className="flex gap-2 flex-wrap">
          {result.court && <Badge variant="secondary" className="text-xs font-medium">{result.court}</Badge>}
          {result.date && <Badge variant="outline" className="text-xs">{result.date}</Badge>}
          {result.citation && <Badge variant="outline" className="text-xs">{result.citation}</Badge>}
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground">#{result.doc_id}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
