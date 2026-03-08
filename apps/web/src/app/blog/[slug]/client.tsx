"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Scale, Clock, ArrowRight, ArrowLeft, ChevronRight, Sparkles, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BetaSignupForm } from "@/components/beta-signup-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BlogPost } from "@/lib/blog-data";

const CATEGORY_LABELS: Record<string, string> = {
  guides: "Guide",
  "legal-info": "Legal Info",
  product: "Product",
};

export function BlogPostClient({ post }: { post: BlogPost }) {
  const headerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: headerRef, offset: ["start start", "end start"] });
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -3 }}
              whileTap={{ scale: 0.95 }}
              className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center"
            >
              <Scale className="h-4 w-4 text-primary-foreground" />
            </motion.div>
            <span className="font-bold text-lg">LexHelm</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Blog
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm">Get Started Free</Button>
              </motion.div>
            </Link>
          </div>
        </div>
        {/* Reading progress bar */}
        <motion.div
          className="h-[2px] bg-primary origin-left"
          style={{ width: progressWidth }}
        />
      </motion.nav>

      {/* Breadcrumbs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-6"
      >
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{post.title}</span>
        </nav>
      </motion.div>

      {/* Article */}
      <article ref={headerRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Header */}
          <header className="mb-10">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex items-center gap-3 mb-5"
            >
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_LABELS[post.category] || post.category}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {post.readingTime}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(post.publishedAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]"
            >
              {post.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-5 text-lg text-muted-foreground leading-relaxed"
            >
              {post.description}
            </motion.p>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-6 h-px bg-gradient-to-r from-primary/30 via-border to-transparent origin-left"
            />
          </header>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:bg-accent/30 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-14 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 p-8 relative overflow-hidden"
          >
            <motion.div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-4"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2">{post.cta.label}</h2>
                <p className="text-sm text-muted-foreground">
                  Join the LexHelm beta to create legally valid documents with AI in minutes.
                </p>
              </div>
              <BetaSignupForm referrer={`/blog/${post.slug}`} variant="inline" className="max-w-md mx-auto" />
              <div className="text-center mt-4 flex flex-col items-center gap-3">
                <Link href={post.cta.href} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Learn more about this document type <ArrowRight className="h-3 w-3" />
                </Link>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> 500+ beta users</span>
                  <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> No spam</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Back to blog */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to all articles
            </Link>
          </motion.div>
        </motion.div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">LexHelm</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/create/rental-agreement" className="hover:text-foreground transition-colors">Rental Agreement</Link>
            <Link href="/create/nda" className="hover:text-foreground transition-colors">NDA</Link>
            <Link href="/create/legal-notice" className="hover:text-foreground transition-colors">Legal Notice</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
