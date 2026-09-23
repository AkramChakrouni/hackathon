import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The knowledge corpus, vector index and questionnaires are read from disk at request time.
  outputFileTracingIncludes: { "/*": ["./data/**/*"] },
};

export default nextConfig;
