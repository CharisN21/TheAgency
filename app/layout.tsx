import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Agency",
  description:
    "Run every venture you own from one calm place: projects, people, meetings and the coaching that comes from your own decisions.",
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
      {/* Browser extensions sometimes add attributes to body before the app loads. */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
