"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Scale, FileText, Search, MessageSquare, Shield, Zap, ArrowRight,
  CheckCircle2, Sparkles, BookOpen, Users, Clock, Star, ChevronRight,
  Briefcase, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BetaSignupForm } from "@/components/beta-signup-form";
import { useAuth } from "@/lib/auth";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const FEATURES = [
  {
    icon: Search,
    title: "AI Case Research",
    desc: "Find court decisions, laws, and legal precedents relevant to your situation.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: FileText,
    title: "Smart Drafting",
    desc: "Answer a few simple questions and get a ready-to-use legal document. No legal background needed.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: MessageSquare,
    title: "Doc Chat",
    desc: "Upload any contract and ask questions in plain English. Find out what you're agreeing to.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Briefcase,
    title: "Deep Research",
    desc: "Ask a detailed legal question and get a thorough research report with cases, laws, and recommendations.",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
];

const DOCUMENT_TYPES = [
  { label: "Rental Agreement", href: "/create/rental-agreement", icon: "🏠" },
  { label: "NDA / Confidentiality Agreement", href: "/create/nda", icon: "🔒" },
  { label: "Legal Notice", href: "/create/legal-notice", icon: "⚖️" },
  { label: "Service / Freelancer Agreement", href: "/create/service-agreement", icon: "🤝" },
  { label: "Power of Attorney", href: "/create/power-of-attorney", icon: "📝" },
];

const STATS = [
  { value: "10,000+", label: "Documents Created" },
  { value: "50+", label: "Ready-Made Templates" },
  { value: "100M+", label: "Legal Cases Searchable" },
  { value: "All States", label: "Across India" },
];

const STEPS = [
  { step: "1", title: "Describe Your Document", desc: "Tell our AI what you need in plain English — names, terms, amounts, and conditions.", icon: MessageSquare },
  { step: "2", title: "AI Drafts It", desc: "Our AI generates a complete, legally formatted document with all necessary clauses for Indian law.", icon: Sparkles },
  { step: "3", title: "Download & Use", desc: "Review, edit if needed, and download as PDF or DOCX. Print, sign, and you're done.", icon: FileText },
];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while checking auth (prevents flash)
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-2xl border-2 border-primary/20"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ─── Navbar ─── */}
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Blog
            </Link>
            <Link href="/create/rental-agreement" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden md:inline">
              Documents
            </Link>
            <Link href="/login">
              <Button size="sm" variant="outline">Sign In</Button>
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Get Started
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative py-20 md:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-violet-500/5" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.45 0.15 280 / 0.1) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <motion.div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-500/8 blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ y: [0, 15, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-semibold mb-6">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                India&apos;s #1 AI Legal Assistant
              </Badge>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]"
            >
              Legal Documents, Contracts & Answers{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-primary">
                — Simplified
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Create rental agreements, NDAs, legal notices, and more in seconds.
              Search Indian case law, review contracts, and get AI-powered legal answers — no lawyer jargon required.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-8">
              <BetaSignupForm referrer="/" variant="hero" className="max-w-lg mx-auto" />
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-6 flex flex-wrap justify-center gap-5 text-xs text-muted-foreground"
            >
              {[
                { icon: Zap, label: "No Legal Knowledge Needed" },
                { icon: Globe, label: "Valid Across All Indian States" },
                { icon: Clock, label: "Ready in Under a Minute" },
                { icon: Shield, label: "AI-Checked for Accuracy" },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{item.label}</span>
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── Stats Bar ─── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-y border-border/50 py-8 bg-accent/20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-10 md:gap-16">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-center"
            >
              <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ─── Document Types ─── */}
      <section className="py-14 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <p className="text-sm font-semibold text-primary mb-2">Popular Documents</p>
            <h2 className="text-xl font-bold">What do you need to create?</h2>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3"
          >
            {DOCUMENT_TYPES.map((doc) => (
              <motion.div key={doc.href} variants={staggerItem}>
                <Link href={doc.href}>
                  <motion.div
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    <span className="text-base">{doc.icon}</span>
                    <span className="text-sm font-medium">{doc.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs font-semibold mb-4">
              <Sparkles className="h-3 w-3 text-primary" />
              Platform Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need, whether you&apos;re a lawyer or not
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              From research to drafting to analysis — LexHelm handles it all with the power of AI.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-2 gap-5"
          >
            {FEATURES.map((f) => (
              <motion.div key={f.title} variants={staggerItem}>
                <Card className="h-full group hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-violet-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardContent className="relative flex items-start gap-4 p-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`h-12 w-12 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}
                    >
                      <f.icon className={`h-6 w-6 ${f.color}`} />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 md:py-28 bg-accent/30 relative overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">
              Three simple steps to your legally-compliant document
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {STEPS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                className="text-center relative"
              >
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-border to-transparent" />
                )}
                <motion.div
                  whileHover={{ scale: 1.1, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/10 relative mb-6"
                >
                  <item.icon className="h-9 w-9 text-primary" />
                  <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why LexHelm ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Lawyers, Built for Everyone</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-lg">Whether you&apos;re a legal professional, business owner, or first-time tenant — LexHelm has you covered</p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {[
              { icon: Globe, title: "All Indian States", desc: "Compliant with state-specific regulations across India — stamp duty, registration, and local laws." },
              { icon: Shield, title: "Legally Accurate", desc: "Every document follows the Indian Contract Act, 1872, Registration Act, and applicable statutes." },
              { icon: Zap, title: "10x Faster", desc: "What takes hours with a lawyer takes seconds with LexHelm. No more template hunting." },
              { icon: BookOpen, title: "Plain English Explanations", desc: "AI breaks down complex legal language so you understand exactly what you're dealing with." },
              { icon: Users, title: "For Individuals & Teams", desc: "Whether you're a solo freelancer or a 50-person team, LexHelm scales with you." },
              { icon: Star, title: "Free During Beta", desc: "Full access to all features during our beta period. No credit card required." },
            ].map((item) => (
              <motion.div key={item.title} variants={staggerItem}>
                <div className="p-6 rounded-xl border border-border hover:border-primary/20 hover:shadow-md transition-all duration-300 h-full">
                  <item.icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold mb-1.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonial / Social Proof ─── */}
      <section className="py-16 bg-accent/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I created a rental agreement for my flat in 10 minutes. No lawyer fees, no confusing forms.",
                name: "Priya M.",
                role: "Small Business Owner, Mumbai",
              },
              {
                quote: "We use LexHelm for all our NDAs and service contracts. It saves my startup thousands every month.",
                name: "Arjun K.",
                role: "Startup Founder, Bangalore",
              },
              {
                quote: "The case research is faster than anything I\u2019ve used. I draft memos in half the time now.",
                name: "Adv. Sonal R.",
                role: "Litigation Lawyer, Delhi",
              },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="flex justify-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <blockquote className="text-sm font-medium text-foreground leading-relaxed mb-3">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Blog / Resources ─── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h2 className="text-2xl font-bold">Guides & How-Tos</h2>
              <p className="text-sm text-muted-foreground mt-1">Free guides to help you navigate Indian law</p>
            </div>
            <Link href="/blog" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "How to Create a Rental Agreement Online in India", href: "/create/rental-agreement", tag: "Guide" },
              { title: "NDA Templates: When and How to Use Them", href: "/create/nda", tag: "Legal Info" },
              { title: "Understanding Legal Notices in India", href: "/create/legal-notice", tag: "Guide" },
            ].map((post, i) => (
              <motion.div
                key={post.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Link href={post.href} className="block group">
                  <Card className="hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300">
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="text-[10px] mb-3">{post.tag}</Badge>
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors leading-snug">{post.title}</h3>
                      <span className="mt-3 text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read more <ChevronRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24 md:py-32 bg-gradient-to-br from-primary/5 via-background to-violet-500/5 relative overflow-hidden">
        <motion.div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-violet-500/5 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6 shadow-lg shadow-primary/10"
            >
              <Scale className="h-8 w-8 text-primary" />
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
              Get your first document in under 5 minutes
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of legal professionals and businesses using LexHelm to draft documents faster. Free during beta.
            </p>
            <BetaSignupForm referrer="/" variant="hero" className="max-w-lg mx-auto" />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center justify-center gap-5 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Free during beta</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Indian law compliant</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-4 w-4 text-primary" />
                <span className="font-bold">LexHelm</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI-powered legal assistant for India. Create documents, search case law, and review contracts.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Documents</h4>
              <ul className="space-y-2">
                <li><Link href="/create/rental-agreement" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Rental Agreement</Link></li>
                <li><Link href="/create/nda" className="text-xs text-muted-foreground hover:text-foreground transition-colors">NDA</Link></li>
                <li><Link href="/create/legal-notice" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Legal Notice</Link></li>
                <li><Link href="/create/service-agreement" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Service Agreement</Link></li>
                <li><Link href="/create/power-of-attorney" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Power of Attorney</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Platform</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link href="/blog" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">Terms of Service</span></li>
                <li><span className="text-xs text-muted-foreground">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} LexHelm. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">Made in India for Indian Law</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
