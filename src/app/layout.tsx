import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QAVeil AI",
  description: "Reveal what your requirements don't tell you.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
