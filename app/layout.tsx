import "../styles/globals.css";
import Providers from "@/components/Providers";


export const metadata = {
  title: "BugSnap AI",
  description: "From screenshot to Jira-ready bug in under a minute",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
