// The Messaging Assistant is mounted under /messaging on the Derby Control hub (PotatOS), which
// proxies /messaging/* to this deployment. basePath keeps every route, asset and API under that
// prefix on the standalone hostname too, so the same build serves both. NEXT_PUBLIC_BASE_PATH
// is exposed for the places that build a URL by hand (src/lib/basePath.ts).
const BASE_PATH = "/messaging";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  async redirects() {
    return [
      // The standalone hostname's root still lands on the app.
      { source: "/", destination: BASE_PATH, basePath: false, permanent: false },
      // Banners embedded in Teams messages sent before the mount keep loading.
      { source: "/banners/:path*", destination: `${BASE_PATH}/banners/:path*`, basePath: false, permanent: false },
    ];
  },
};

export default nextConfig;
