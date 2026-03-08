"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { submitBetaRequest, trackEvent } from "@/lib/api";

interface BetaSignupFormProps {
  referrer?: string;
  variant?: "inline" | "card" | "hero";
  className?: string;
}

export function BetaSignupForm({ referrer, variant = "card", className = "" }: BetaSignupFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [useCase, setUseCase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await submitBetaRequest({
        email: email.trim(),
        name: name.trim() || undefined,
        company: company.trim() || undefined,
        use_case: useCase.trim() || undefined,
        referrer,
      });
      trackEvent("beta_form_submit", { referrer, variant });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (variant === "inline") {
    return (
      <div className={className}>
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-emerald-600"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">You&apos;re on the list! We&apos;ll be in touch.</span>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex gap-2"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 rounded-lg"
              />
              <Button type="submit" disabled={submitting} className="gap-1.5 rounded-lg">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Join Beta
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={className}>
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
            >
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">You&apos;re on the waitlist!</p>
                <p className="text-xs text-muted-foreground">We&apos;ll email you when your access is ready.</p>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} className="space-y-3" exit={{ opacity: 0 }}>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 rounded-lg h-11"
                />
                <Button type="submit" size="lg" disabled={submitting} className="gap-2 rounded-lg px-6">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Join Beta
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">Free early access. No credit card required.</p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // "card" variant — full form
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 ${className}`}>
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">You&apos;re on the waitlist!</h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll review your request and email you when your access is ready.
            </p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={handleSubmit} className="space-y-4" exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Get Early Access</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              LexHelm is in private beta. Join the waitlist to get early access.
            </p>
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg"
              />
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg"
              />
              <Input
                placeholder="Company / Organization"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="rounded-lg"
              />
              <textarea
                placeholder="What do you plan to use LexHelm for?"
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full gap-2 rounded-lg" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {submitting ? "Submitting..." : "Request Early Access"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Free during beta. We&apos;ll never spam you.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
