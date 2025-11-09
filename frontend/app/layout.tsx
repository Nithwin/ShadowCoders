import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const poppins = Poppins({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '600', '700'],
  preload: false,
});

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  preload: false,
});

// 2. Configure Local Font
const alanSans = localFont({
  src: '../public/fonts/AlanSansRegular.ttf',
  display: 'swap',
  variable: '--font-alan-sans',
  preload: false,
});
const aerospace = localFont({
  src: '../public/fonts/Aerospace.ttf',
  display: 'swap',
  variable: '--font-aerospace',
  preload: false,
});

export const metadata: Metadata = {
  title: "ShadowCoders",
  description: "A Platform which takes your skills to whole another level",
  icons:'/images/logo-light.png'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
  <body className={`${poppins.variable} ${inter.variable} ${alanSans.variable} ${aerospace.variable}`}>
       <AuthProvider >{children} </AuthProvider>
      </body>
    </html>
  );
}