import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Articus - AI IELTS Speaking Practice",
  description: "Master your English speaking skills with real-time AI feedback and scoring. Get instant band scores and improvement tips.",
  openGraph: {
    title: "Articus - AI IELTS Speaking Practice",
    description: "Master your English speaking skills with real-time AI feedback and scoring.",
    url: "https://articus-two.vercel.app", // Replace with your actual URL
    siteName: "Articus",
    images: [
      {
        url: "/img/thumb.png",
        width: 1200,
        height: 630,
        alt: "Articus AI IELTS Speaking Practice",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Articus - AI IELTS Speaking Practice",
    description: "Master your English speaking skills with real-time AI feedback and scoring.",
    images: ["/img/thumb.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
