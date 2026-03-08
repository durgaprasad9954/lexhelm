import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthShell } from "@/components/auth-shell";
import { Providers } from "@/components/providers";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lexhelm.com";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "LexHelm — Create Legal Documents Online | AI Legal Platform India",
    template: "%s | LexHelm",
  },
  description:
    "Create rental agreements, NDAs, legal notices, and more with AI. Search Indian case law, draft legal documents, and analyze contracts online. Free AI-powered legal intelligence platform.",
  keywords: [
    "create rental agreement online",
    "NDA template India",
    "legal notice format",
    "AI legal assistant India",
    "create NDA online",
    "rent agreement online",
    "legal document generator",
    "Indian case law search",
    "contract review AI",
    "power of attorney format India",
    "service agreement template",
    "legal research tool India",
  ],
  authors: [{ name: "LexHelm" }],
  creator: "LexHelm",
  publisher: "LexHelm",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: "LexHelm",
    title: "LexHelm — Create Legal Documents Online | AI Legal Platform India",
    description:
      "Create rental agreements, NDAs, legal notices, and more with AI. Free AI-powered legal intelligence platform for India.",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "LexHelm — AI-Powered Legal Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LexHelm — Create Legal Documents Online | AI Legal Platform India",
    description:
      "Create rental agreements, NDAs, legal notices, and more with AI. Free AI-powered legal intelligence platform for India.",
    images: [`${BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LexHelm",
    applicationCategory: "LegalService",
    operatingSystem: "Web",
    description:
      "AI-powered legal intelligence platform for creating rental agreements, NDAs, legal notices, and searching Indian case law.",
    url: BASE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "LexHelm",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    description:
      "AI-powered legal intelligence platform for India. Create legal documents, search case law, and analyze contracts.",
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <AuthShell>{children}</AuthShell>
        </Providers>
      </body>
    </html>
  );
}
