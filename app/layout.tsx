import type { Metadata } from "next";
import { Chakra_Petch, Geist_Mono } from "next/font/google";
import "./globals.css";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitron",
  description: "Bootleg generative signals for idle monitors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${chakra.variable} ${geistMono.variable} h-full overflow-y-auto antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
