import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMS — Sharada Public School, Vijayapura 586-109",
  description:
    "Syllabus Management System for Sharada Public School, Vijayapura (586-109). Teachers submit syllabus, HODs/Coordinators/Principals review & approve, Superadmins manage the system.",
  keywords: [
    "Sharada Public School",
    "Vijayapura",
    "SMS",
    "Syllabus Management",
    "School",
  ],
  authors: [{ name: "Omkar RG, Dept. of CS, Sharada Public School" }],
  icons: {
    icon: "/favicon-s.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
