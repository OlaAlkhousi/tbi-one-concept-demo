import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-tools button overlaps the sidebar during live demos.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
