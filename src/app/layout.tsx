import type { Metadata } from "next";
import { Cinzel, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const display = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "800"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Dom the Don · Viewer Games",
  description: "Wheel of Names-style viewer games with TikFinity !enter webhooks",
  icons: {
    icon: "/dom-the-don-d.png",
    apple: "/dom-the-don-d.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
