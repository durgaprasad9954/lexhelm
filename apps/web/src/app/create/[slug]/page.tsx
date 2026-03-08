import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LANDING_PAGES, SITE_URL, type LandingPageSlug } from "@/lib/seo";
import { LandingPageClient } from "./client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(LANDING_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = LANDING_PAGES[slug as LandingPageSlug];
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    keywords: [...page.keywords],
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${SITE_URL}/create/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
    alternates: {
      canonical: `${SITE_URL}/create/${slug}`,
    },
  };
}

export default async function CreateLandingPage({ params }: Props) {
  const { slug } = await params;
  const page = LANDING_PAGES[slug as LandingPageSlug];
  if (!page) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Create", item: `${SITE_URL}/create` },
      { "@type": "ListItem", position: 3, name: page.h1, item: `${SITE_URL}/create/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingPageClient slug={slug} page={page} />
    </>
  );
}
