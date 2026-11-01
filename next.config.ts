import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker liviana: solo el servidor y las dependencias que usa.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // La importación del catálogo recibe archivos de hasta 5 MB por server action (el límite
  // por omisión es 1 MB). El lector vuelve a validar el tamaño.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
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
