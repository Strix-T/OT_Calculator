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
})(baseConfig);
