"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  Scale, CheckCircle2, ArrowRight, FileText, Shield,
  AlertTriangle, Handshake, UserCheck, Home, ChevronRight,
  Sparkles, Zap, Clock, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BetaSignupForm } from "@/components/beta-signup-form";
import type { LANDING_PAGES } from "@/lib/seo";

const ICONS: Record<string, React.ElementType> = {
  Home, Shield, AlertTriangle, Handshake, UserCheck, FileText,
};

const COLORS: Record<string, { bg: string; text: string; gradient: string; glow: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600", gradient: "from-blue-500/10 to-indigo-500/10", glow: "shadow-blue-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-600", gradient: "from-violet-500/10 to-purple-500/10", glow: "shadow-violet-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600", gradient: "from-amber-500/10 to-orange-500/10", glow: "shadow-amber-500/20" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600", gradient: "from-emerald-500/10 to-teal-500/10", glow: "shadow-emerald-500/20" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-600", gradient: "from-rose-500/10 to-pink-500/10", glow: "shadow-rose-500/20" },
};

type PageData = (typeof LANDING_PAGES)[keyof typeof LANDING_PAGES];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function LandingPageClient({ slug, page }: { slug: string; page: PageData }) {
  const IconComponent = ICONS[page.icon] || FileText;
  const colors = COLORS[page.color] || COLORS.violet;
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
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
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Blog
            </Link>
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

      {/* Breadcrumbs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-4"
      >
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{page.h1}</span>
        </nav>
      </motion.div>

      {/* Hero */}
      <section ref={heroRef} className={`relative overflow-hidden bg-gradient-to-br ${colors.gradient} py-20 md:py-28`}>
        {/* Animated background dots */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.45 0.15 280 / 0.1) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
        {/* Floating orbs */}
        <motion.div
          className={`absolute -top-20 -right-20 w-72 h-72 rounded-full ${colors.bg} blur-3xl`}
          animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
          animate={{ y: [0, 15, 0], x: [0, -10, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div className="max-w-3xl">
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className={`inline-flex items-center gap-2 ${colors.bg} ${colors.text} px-4 py-2 rounded-full text-xs font-semibold mb-6 border border-current/10`}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <IconComponent className="h-3.5 w-3.5" />
              </motion.div>
              AI-Powered Document Generator
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              {page.h1}
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
            >
              {page.description.replace(/ \| LexHelm$/, "")}
            </motion.p>

            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
              <BetaSignupForm referrer={`/create/${slug}`} variant="hero" className="mt-8 max-w-lg" />
            </motion.div>

            {/* Trust badges */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap gap-5"
            >
              {[
                { icon: Zap, label: "Instant Generation" },
                { icon: Shield, label: "Legally Accurate" },
                { icon: Clock, label: "Ready in Seconds" },
              ].map((badge) => (
                <div key={badge.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <badge.icon className={`h-3.5 w-3.5 ${colors.text}`} />
                  <span className="font-medium">{badge.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Social Proof Bar */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-b border-border/50 py-6 bg-accent/20"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-8 md:gap-14">
          {[
            { value: "10,000+", label: "Documents Created" },
            { value: "99.9%", label: "Legal Accuracy" },
            { value: "< 30s", label: "Average Generation Time" },
            { value: "4.9/5", label: "User Rating" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-center"
            >
              <div className={`text-xl font-bold ${colors.text}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <section className="py-20 md:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className={`inline-flex items-center gap-2 ${colors.bg} ${colors.text} px-3 py-1.5 rounded-full text-xs font-semibold mb-4`}>
            <Sparkles className="h-3 w-3" />
            Features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What&apos;s Included
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Every document is AI-generated with legally accurate clauses specific to Indian law.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {page.features.map((feature) => (
            <motion.div key={feature} variants={staggerItem}>
              <Card className="h-full group hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
                <CardContent className="flex items-start gap-3 pt-5">
                  <motion.div whileHover={{ scale: 1.2, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <CheckCircle2 className={`h-5 w-5 shrink-0 mt-0.5 ${colors.text}`} />
                  </motion.div>
                  <p className="text-sm font-medium">{feature}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-24 bg-accent/30 relative overflow-hidden">
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
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Three simple steps to your legally-compliant document
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6">
            {[
              { step: "1", title: "Describe Your Needs", desc: "Tell our AI what document you need in plain English. Include details like names, amounts, and terms.", icon: FileText },
              { step: "2", title: "AI Drafts the Document", desc: "Our AI generates a complete, legally formatted document with all necessary clauses and terms.", icon: Sparkles },
              { step: "3", title: "Download & Use", desc: "Review, edit if needed, and download as PDF or DOCX. Print, sign, and you're done.", icon: ArrowRight },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                className="text-center relative"
              >
                {/* Connector line between steps */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-border to-transparent" />
                )}
                <motion.div
                  whileHover={{ scale: 1.1, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${colors.bg} ${colors.text} text-2xl font-bold mb-5 shadow-lg ${colors.glow} relative`}
                >
                  <item.icon className="h-7 w-7" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
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

      {/* FAQs */}
      <section className="py-20 md:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about our AI document generation
          </p>
        </motion.div>

        <div className="space-y-3">
          {page.faqs.map((faq, i) => (
            <motion.details
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="group border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold hover:bg-accent/30 transition-colors">
                {faq.q}
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-open:rotate-90 shrink-0 ml-4" />
              </summary>
              <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                {faq.a}
              </div>
            </motion.details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className={`py-20 md:py-24 bg-gradient-to-br ${colors.gradient} relative overflow-hidden`}>
        <motion.div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="max-w-3xl mx-auto text-center px-4 sm:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${colors.bg} mb-6 shadow-lg ${colors.glow}`}
            >
              <IconComponent className={`h-7 w-7 ${colors.text}`} />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to {page.h1.toLowerCase().replace("create ", "create your ")}?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
              Join the waitlist to get early access. Create legal documents with AI — free during beta.
            </p>
            <BetaSignupForm referrer={`/create/${slug}`} variant="inline" className="max-w-md mx-auto" />
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> 500+ beta users</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> No spam, ever</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">LexHelm</span>
            <span className="text-xs text-muted-foreground">&middot; AI Legal Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/create/rental-agreement" className="hover:text-foreground transition-colors">Rental Agreement</Link>
            <Link href="/create/nda" className="hover:text-foreground transition-colors">NDA</Link>
            <Link href="/create/legal-notice" className="hover:text-foreground transition-colors">Legal Notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
