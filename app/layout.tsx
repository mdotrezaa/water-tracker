import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Water Tracker",
  description: "Track your daily water intake",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>{children}</body>
    </html>
  );
}
