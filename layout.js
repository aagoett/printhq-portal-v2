import { Space_Mono } from 'next/font/google'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata = {
  title: 'PRINTHQ - Automated Print Production System',
  description: 'Get instant quotes, upload artwork, and automate your print workflow with PRINTHQ',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={spaceMono.variable}>{children}</body>
    </html>
  )
}