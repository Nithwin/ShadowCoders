import type { Metadata } from "next";
import { Inter, Poppins, } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

// 2. Configure Local Font
const alanSans = localFont({
  src: '../public/fonts/AlanSansRegular.ttf',
  display: 'swap',
  variable: '--font-alan-sans',
});
const aerospace = localFont({
  src: '../public/fonts/Aerospace.ttf',
  display: 'swap',
  variable: '--font-aerospace',
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
      <body className={`${poppins.variable} ${inter.variable} ${alanSans.variable} ${aerospace.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}