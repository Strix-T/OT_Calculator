import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const baseConfig = {
  reactStrictMode: true,
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: !isProd,
  // `next-pwa` precaches almost everything in `public/` by default.
  // These legacy icons are no longer referenced by the app/manifest, so exclude them.
  publicExcludes: ["!noprecache/**/*", "!icons/icon-192.png", "!icons/icon-512.png"],
})(baseConfig);
