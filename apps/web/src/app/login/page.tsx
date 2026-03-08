"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Scale, Shield, Zap, BookOpen, FileText, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, googleClientId, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

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
          <span className="text-sm text-muted-foreground font-medium">Loading...</span>
        </motion.div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-violet-500/5" />
      <div
        className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.45 0.15 280 / 0.15) 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      {/* Floating orbs */}
      <motion.div
        className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-5xl flex rounded-2xl overflow-hidden shadow-2xl border border-border bg-card"
      >
        {/* Left Side - Feature showcase */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-primary/10 via-accent to-primary/5 flex-col justify-center p-10 relative overflow-hidden">
          <motion.div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div {...fadeUp(0.2)} className="relative">
            <div className="flex items-center gap-3 mb-8">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -5 }}
                className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg"
              >
                <Scale className="h-7 w-7 text-primary-foreground" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">LexHelm</h2>
                <p className="text-xs text-muted-foreground font-medium">Legal Intelligence Platform</p>
              </div>
            </div>

            <motion.h3
              {...fadeUp(0.3)}
              className="text-lg font-semibold text-foreground mb-6"
            >
              AI-powered tools for modern legal professionals
            </motion.h3>

            <div className="space-y-3">
              {[
                { icon: BookOpen, label: "Case Research", desc: "Search millions of Indian legal cases instantly" },
                { icon: Zap, label: "Smart Drafting", desc: "Generate legal documents with AI assistance" },
                { icon: Shield, label: "Document Analysis", desc: "Extract key terms, risks, and obligations" },
                { icon: Search, label: "Deep Research", desc: "Async AI research across case law databases" },
              ].map((feature, i) => (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.1, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className="flex items-start gap-3 rounded-lg bg-background/60 backdrop-blur-sm p-3 border border-transparent hover:border-primary/10 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 flex items-center gap-6 text-xs text-muted-foreground"
            >
              {[
                { color: "bg-emerald-500", label: "100% Secure" },
                { color: "bg-blue-500", label: "24/7 AI Access" },
                { color: "bg-violet-500", label: "IPC Coverage" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <motion.div
                    className={`h-1.5 w-1.5 rounded-full ${item.color}`}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: Math.random() }}
                  />
                  {item.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side - Sign In */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm space-y-8"
          >
            {/* Brand (mobile only) */}
            <div className="text-center md:text-left">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
                className="md:hidden mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4"
              >
                <Scale className="h-8 w-8 text-primary" />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to access your legal workspace
              </p>
            </div>

            {/* Google Login */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="space-y-4"
            >
              {googleClientId ? (
                <div className="flex justify-center">
                  <GoogleOAuthProvider clientId={googleClientId}>
                    <GoogleLogin
                      onSuccess={(response) => {
                        loginWithGoogle(response).catch(console.error);
                      }}
                      onError={() => {
                        console.error("Google login failed");
                      }}
                      theme="outline"
                      size="large"
                      width="320"
                      text="signin_with"
                      shape="rectangular"
                      logo_alignment="left"
                    />
                  </GoogleOAuthProvider>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800">
                    Google OAuth not configured. Set <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in your environment.
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Using dev auto-login — you should be redirected automatically.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">Secure & Private</span>
              </div>
            </motion.div>

            {/* Quick document types */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.4 }}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { icon: FileText, label: "NDAs" },
                { icon: Shield, label: "Agreements" },
                { icon: Sparkles, label: "AI Drafts" },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-accent/30 border border-transparent hover:border-primary/10 transition-colors cursor-default"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center space-y-2"
            >
              <p className="text-xs text-muted-foreground">
                No password needed &middot; Your data is protected
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
