import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog-data";
import { SITE_URL } from "@/lib/seo";
import { BlogIndexClient } from "./client";

export const metadata: Metadata = {
  title: "Legal Blog — Guides, Templates & Tips",
  description:
    "Free legal guides for India. Learn how to create rental agreements, NDAs, legal notices, and more. Expert tips on Indian law and AI-powered legal tools.",
  openGraph: {
    title: "Legal Blog — Guides, Templates & Tips | LexHelm",
    description:
      "Free legal guides for India. Learn how to create rental agreements, NDAs, legal notices, and more.",
    url: `${SITE_URL}/blog`,
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

export default function BlogPage() {
  return <BlogIndexClient posts={BLOG_POSTS} />;
}
