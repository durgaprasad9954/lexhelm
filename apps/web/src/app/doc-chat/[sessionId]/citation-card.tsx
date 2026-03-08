"use client";
import { motion } from "framer-motion";
import { Quote, FileText } from "lucide-react";
import type { Citation } from "@/lib/api";

interface CitationCardProps {
  citation: Citation;
  index: number;
}

export function CitationCard({ citation, index }: CitationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.6 + index * 0.15 }}
      className="group relative border border-border/60 rounded-xl px-3.5 py-2.5
                 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70
                 dark:hover:bg-amber-950/30 transition-colors cursor-default"
    >
      <div className="flex items-start gap-2">
        <Quote className="h-3.5 w-3.5 text-amber-600/60 dark:text-amber-400/60 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed text-foreground/80 italic">
            &ldquo;{citation.text}&rdquo;
          </p>
          {citation.clause_ref && (
            <div className="mt-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {citation.clause_ref}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-amber-500/50" />
    </motion.div>
  );
}
