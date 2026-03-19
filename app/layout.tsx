import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getLocale } from 'next-intl/server'
import "./globals.css";

export const metadata: Metadata = {
  title: "Jaxtina EduOS",
  description: "English learning management system by Jaxtina English Centre",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale   = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
