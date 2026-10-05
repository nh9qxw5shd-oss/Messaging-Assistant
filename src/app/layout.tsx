import type { Metadata } from "next";
import localFont from "next/font/local";
import { THEME_INIT_SCRIPT } from "@/lib/themeScript";
import "./globals.css";

const manrope = localFont({ src: "./fonts/manrope.woff2", variable: "--font-manrope", weight: "400 800", display: "swap" });
const jetbrains = localFont({ src: "./fonts/jetbrains-mono.woff2", variable: "--font-jetbrains", weight: "400 700", display: "swap" });

export const metadata: Metadata = {
  title: "Messaging Assistant — East Midlands Route",
  description: "Operational messaging tool for the East Midlands Control Centre.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
