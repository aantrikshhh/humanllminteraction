import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";

import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turing Games",
  description:
    "Multiplayer social-strategy rooms where some opponents may be hidden LLM seats and you do not know which is which.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
