import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Legal Documents Online | AI Document Drafting",
  description:
    "Create rental agreements, NDAs, legal notices, service agreements, and power of attorney online with AI. Free legal document generator for India.",
  keywords: [
    "create legal documents online",
    "AI document drafting",
    "rental agreement generator",
    "NDA generator",
    "legal notice generator",
    "create rent agreement online",
  ],
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
