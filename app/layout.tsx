import "../styles/globals.css";
import Providers from "@/components/Providers";
import Script from "next/script";

export const metadata = {
  title: "BugSnap AI",
  description: "From screenshot to Jira-ready bug in under a minute",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "android-chrome",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Google Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WZYB57SELK"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-WZYB57SELK');
          `}
        </Script>

        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
