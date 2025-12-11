// app/layout.js
import './global.css';

export const metadata = {
  title: 'PrintHQ Portal',
  description: 'Customer portal for print jobs and proofs',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
