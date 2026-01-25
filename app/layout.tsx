import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SupabaseProvider } from "@/contexts/SupabaseContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shop Manager",
  description: "Manage your Shops, Sales, and Commissions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <ErrorBoundary>
          <SupabaseProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SupabaseProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
