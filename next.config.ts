import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Permite abrir el servidor de desarrollo desde otro dispositivo de la red local (p. ej. el teléfono)
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
