// The Messaging Assistant is mounted under /messaging on the Derby Control hub (PotatOS), which
// proxies /messaging/* to this deployment. basePath keeps every route, asset and API under that
// prefix on the standalone hostname too, so the same build serves both. NEXT_PUBLIC_BASE_PATH
// is exposed for the places that build a URL by hand (src/lib/basePath.ts).
const BASE_PATH = "/messaging";

// Overseer is the only way in (PotatOS docs/09 §4.6). The hub marks every request it forwards with
// x-overseer-hop; a page load without the marker (a bookmark or link to this hostname) goes to the same
// address on Overseer, which signs the person in and frames this page. Scripts, data, API calls and
// the storage bridge are untouched. The marker routes people; it is not a secret.
const VIA_OVERSEER = {
  source: "/:path((?!.*storage-bridge).*)",
  has: [{ type: "header", key: "sec-fetch-dest", value: "(document|iframe)" }],
  missing: [{ type: "header", key: "x-overseer-hop", value: "overseer" }],
  destination: "https://overseer.derbycontrol.co.uk/:path",
  basePath: false,
  permanent: false,
};

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
      VIA_OVERSEER,
    ];
  },
};

export default nextConfig;
