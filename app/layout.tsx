import { Chakra_Petch, Geist_Mono } from "next/font/google";
import { PhotosensitiveAlert } from "@/components/PhotosensitiveAlert";
import { rootMetadata } from "@/lib/seo";
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

export const metadata = rootMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${chakra.variable} ${geistMono.variable} h-full overflow-y-auto antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <PhotosensitiveAlert />
        {children}
      </body>
    </html>
  );
}
