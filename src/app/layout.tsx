import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAKB - Arsh Adhyayan Kendra",
  description: "Worker Management System for Arsh Adhyayan Kendra, Bhuj - Led by Swami Pradeeptananda Sarswati",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.ico",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AAKB",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff9900",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
