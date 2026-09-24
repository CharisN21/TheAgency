import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Agency",
  description:
    "Run every company you own from one calm place: projects, people, meetings and the coaching that comes from your own decisions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "The Agency",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3f2" },
    { media: "(prefers-color-scheme: dark)", color: "#121011" },
  ],
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  )
}
