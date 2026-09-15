import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = {
  ...defineCloudflareConfig(),
  // Use webpack for OpenNext's next/og import rewriting.
  buildCommand: "pnpm exec next build --webpack",
};

export default config;
