import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document Chat | AI Contract Review & Analysis",
  description:
    "Upload legal documents and chat with AI. Get instant contract analysis, risk detection, and key term extraction. AI-powered document review for India.",
  keywords: [
    "AI contract review",
    "document analysis online",
    "contract review AI",
    "legal document analysis",
    "AI legal assistant",
  ],
};

export default function DocChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
