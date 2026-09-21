
/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      ...["/admin/:path*", "/api/:path*", "/rss.xml", "/sitemap.xml"].map((source) => ({
        source, headers: [{ key: "Cache-Control", value: "no-store" }],
      })),
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      {
        source: "/:path*",
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
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
