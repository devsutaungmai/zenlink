import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize webpack for faster HMR
      config.watchOptions = {
        ignored: ['**/node_modules', '**/.git', '**/public/uploads/**', '**/.next/**'],
      }

      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }
    return config
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react', 
      '@heroicons/react',
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'date-fns',
    ],
  },
};

export default nextConfig;
