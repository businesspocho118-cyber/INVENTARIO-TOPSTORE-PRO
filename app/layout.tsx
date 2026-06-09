import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "TOPSTORE Admin",
  description: "Panel de administración TOPSTORE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${dmSans.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-admin-bg text-admin-text antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#161616",
              color: "#F0F0EB",
              border: "1px solid #2A2A2A",
            },
            success: {
              iconTheme: { primary: "#22C55E", secondary: "#161616" },
            },
            error: {
              iconTheme: { primary: "#EF4444", secondary: "#161616" },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

