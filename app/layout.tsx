import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Timecard 9.5 Calculator",
  description: "Screenshot → hours → OT pay with OpenAI vision.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icons/DOT_favicon_16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/DOT_favicon_32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/DOT_favicon.png", sizes: "1024x1024", type: "image/png" },
    ],
    shortcut: ["/icons/DOT_favicon_32.png"],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-167.png", sizes: "167x167", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Timecard OT Calculator",
    description: "Screenshot → hours → OT pay with OpenAI vision.",
    type: "website",
    images: [
      {
        url: "/icons/DOT_share.png",
        width: 1536,
        height: 1024,
        alt: "Overtime. Calculated.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Timecard OT Calculator",
    description: "Screenshot → hours → OT pay with OpenAI vision.",
    images: ["/icons/DOT_share.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans">
        {children}
      </body>
    </html>
  );
}
