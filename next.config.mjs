/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
    }
  } catch {
    /* ignore */
  }
  return undefined;
})();

const remotePatterns = [
  { protocol: 'https', hostname: 'images.unsplash.com' },
  { protocol: 'https', hostname: '**.supabase.co' },
];

if (supabaseHost) {
  remotePatterns.push({ protocol: 'https', hostname: supabaseHost });
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns,
    formats: ['image/webp'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
