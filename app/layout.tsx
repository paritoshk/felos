import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "felos | AI Ad Generation with x402 Micropayments",
  description: "Create AI-powered ads for $0.09 instead of $199/month. Pay per ad with x402 micropayments on Base network.",
  keywords: ["AI", "ad generation", "x402", "micropayments", "Coinbase", "Base", "USDC", "marketing"],
  authors: [{ name: "felos" }],
  openGraph: {
    title: "felos | AI Ad Generation with x402",
    description: "Create AI-powered ads for $0.09 instead of $199/month. Pay per ad with x402 micropayments.",
    url: "https://felos.vercel.app",
    siteName: "felos",
    images: [
      {
        url: "/og-image.png",
        type: "image/png",
        width: 1200,
        height: 630,
        alt: "felos - AI Ad Generation with x402 Micropayments",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "felos | AI Ad Generation with x402",
    description: "Create AI-powered ads for $0.09 instead of $199/month. Pay per ad with x402 micropayments.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://felos.vercel.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
