
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Aumentar si se transfieren archivos grandes
    },
  },
  // Aumentar el timeout para funciones que puedan tardar más
  serverRuntimeConfig: {
    // Para Vercel y App Hosting, puedes necesitar configurar timeouts en el plan
  },
  // Para despliegues en Vercel/App Hosting, los timeouts se gestionan en vercel.json o apphosting.yaml
  // Pero para el servidor de desarrollo local, esto puede ayudar.
  // La configuración más efectiva es a nivel de la plataforma de hosting.
  // Aquí un ejemplo conceptual, aunque la implementación varía.
  // Vamos a añadir una configuración que sí es leída por App Hosting.
};

export default nextConfig;
