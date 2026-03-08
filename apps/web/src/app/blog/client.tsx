"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Scale, Clock, ArrowRight, BookOpen, Sparkles, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BetaSignupForm } from "@/components/beta-signup-form";
import type { BlogPost } from "@/lib/blog-data";

const CATEGORY_LABELS: Record<string, string> = {
  guides: "Guide",
  "legal-info": "Legal Info",
  product: "Product",
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function BlogIndexClient({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
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
            <Link href="/login">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm">Get Started Free</Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Header */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-violet-500/5 py-18 md:py-24 overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-500/5 blur-3xl"
          animate={{ y: [0, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-semibold mb-6"
            >
              <BookOpen className="h-3.5 w-3.5" />
              LexHelm Blog
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Legal Guides & Resources
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Free guides on creating legal documents, understanding Indian law, and using AI for legal work.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-14 md:py-18 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {posts.map((post) => (
            <motion.div key={post.slug} variants={cardVariant}>
              <Link href={`/blog/${post.slug}`} className="block group h-full">
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1.5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[post.category] || post.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {post.readingTime}
                      </span>
                    </div>
                    <CardTitle className="text-base leading-snug group-hover:text-primary transition-colors duration-300">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {post.description}
                    </p>
                    <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2.5 transition-all duration-300">
                      Read more <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Beta Signup CTA */}
      <section className="py-20 bg-gradient-to-r from-primary/5 to-violet-500/5 relative overflow-hidden">
        <motion.div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-5"
            >
              <Sparkles className="h-6 w-6 text-primary" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-3">Ready to create your legal document?</h2>
            <p className="text-muted-foreground text-lg">
              Join the LexHelm beta to draft rental agreements, NDAs, legal notices, and more with AI.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <BetaSignupForm referrer="/blog" variant="card" className="max-w-md mx-auto" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-3 mt-6"
          >
            <Link href="/create/rental-agreement"><Button variant="outline" size="sm">Rental Agreement</Button></Link>
            <Link href="/create/nda"><Button variant="outline" size="sm">NDA</Button></Link>
            <Link href="/create/legal-notice"><Button variant="outline" size="sm">Legal Notice</Button></Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> 500+ beta users</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> No spam, ever</span>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">LexHelm</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/create/rental-agreement" className="hover:text-foreground transition-colors">Rental Agreement</Link>
            <Link href="/create/nda" className="hover:text-foreground transition-colors">NDA</Link>
            <Link href="/create/legal-notice" className="hover:text-foreground transition-colors">Legal Notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
