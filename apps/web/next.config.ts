import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Common misspellings / alternate paths
      { source: "/rental-agreement", destination: "/create/rental-agreement", permanent: true },
      { source: "/nda", destination: "/create/nda", permanent: true },
      { source: "/legal-notice", destination: "/create/legal-notice", permanent: true },
      { source: "/service-agreement", destination: "/create/service-agreement", permanent: true },
      { source: "/power-of-attorney", destination: "/create/power-of-attorney", permanent: true },
      // Alternate document paths
      { source: "/rent-agreement", destination: "/create/rental-agreement", permanent: true },
      { source: "/create-nda", destination: "/create/nda", permanent: true },
      { source: "/create-rental-agreement", destination: "/create/rental-agreement", permanent: true },
      { source: "/draft", destination: "/documents", permanent: true },
      { source: "/drafting", destination: "/documents", permanent: true },
    ];
  },
};

export default nextConfig;
