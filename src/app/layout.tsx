import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Messaging Assistant — East Midlands Route",
  description: "Operational messaging tool for the East Midlands Control Centre.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
