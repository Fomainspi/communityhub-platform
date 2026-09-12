import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommunityHub",
  description: "One platform for communities, social connection and commerce.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
