export const metadata = {
  title: 'Fitgap mock API',
  description: 'Mock server for the Fitgap API, served from its OpenAPI definition.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
