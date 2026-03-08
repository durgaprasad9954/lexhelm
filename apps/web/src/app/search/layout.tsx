import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Indian Case Law | Supreme Court & High Court Judgments",
  description:
    "Search Indian case law online. Find Supreme Court judgments, High Court orders, and legal precedents. AI-powered legal research tool for Indian law.",
  keywords: [
    "Indian case law search",
    "Supreme Court judgments online",
    "High Court case search",
    "find court cases India",
    "legal research tool India",
  ],
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
