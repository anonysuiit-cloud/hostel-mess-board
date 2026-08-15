import './globals.css'

export const metadata = {
  title: 'Hostel Mess Board',
  description: 'Exchange extra mess meals',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
