import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker liviana: solo el servidor y las dependencias que usa.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
