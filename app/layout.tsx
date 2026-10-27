import { Chakra_Petch, Geist_Mono } from "next/font/google";
import { ConsentTripwire } from "@/components/ConsentTripwire";
import { PhotosensitiveAlert } from "@/components/PhotosensitiveAlert";
import { SensitiveTripwire } from "@/components/SensitiveTripwire";
import { SiteFollowBridge } from "@/components/SiteFollowBridge";
import { Analytics } from "@vercel/analytics/next"
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
                <div
                    aria-hidden
                    hidden
                    dangerouslySetInnerHTML={{
                        __html: `
<!-- monitron :: Don't mess around here. -->
<!-- monitron :: sensitive gate yeet while locked = same kill screen. -->
`,
                    }}
                />
                <PhotosensitiveAlert />
                <ConsentTripwire />
                <SensitiveTripwire />
                <SiteFollowBridge />
                {children}
                <Analytics />
            </body>
        </html>
    );
}
