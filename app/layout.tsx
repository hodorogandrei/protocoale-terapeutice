import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'latin-ext'], // latin-ext includes Romanian diacritics
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Protocoale Terapeutice România | Platforma Modernă CNAS',
  description: 'Platformă modernă și ușor de utilizat pentru protocoale terapeutice din România. Căutare avansată, vizualizare structurată și acces rapid la protocoalele CNAS.',
  keywords: ['protocoale terapeutice', 'CNAS', 'medicament', 'România', 'tratament', 'protocol medical'],
  authors: [{ name: 'Protocoale Terapeutice România' }],
  openGraph: {
    type: 'website',
    locale: 'ro_RO',
    title: 'Protocoale Terapeutice România',
    description: 'Platforma modernă pentru protocoale terapeutice CNAS',
    siteName: 'Protocoale Terapeutice România',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ro" className={`${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
