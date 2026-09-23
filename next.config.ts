import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Policies, questionnaires and benchmark results are read from disk at request time.
  outputFileTracingIncludes: { "/*": ["./data/**/*", "./benchmark/**/*"] },
  // The product UI is the designed app in public/TenderScale.dc.html (same origin as the API).
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/TenderScale.dc.html" }] };
  },
};

export default nextConfig;
