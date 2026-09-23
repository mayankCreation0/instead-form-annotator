import type { Metadata } from "next";
import { Lato, Libre_Baskerville, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const libre = Libre_Baskerville({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Form Studio",
  description: "Annotate tax PDF fields and bind them to nested JSON.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${lato.variable} ${libre.variable} ${mono.variable}`}>
        <a className="skip-link" href="#workspace-main">
          Skip to workspace
        </a>
        {children}
      </body>
    </html>
  );
}
