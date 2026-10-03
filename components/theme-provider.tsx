"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Light or dark, following this device unless the person picks one in
 * Settings. The choice is kept on the device, like any appearance setting.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
