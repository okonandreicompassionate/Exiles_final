import localFont from "next/font/local";
import { CartProvider } from "./components/cartProvider";
import "./globals.css";

const coolvetica = localFont({
  src: "../public/fonts/CoolveticaRg-Regular V2.woff2",
  variable: "--font-coolvetica",
  display: "swap",
});

export const metadata = {
  title: "EXILES - TOTEME",
  description:
    "Premium fashion brand - Timeless style crafted for modern expression",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={coolvetica.variable} suppressHydrationWarning>
      <body className={`${coolvetica.className} bg-white text-white antialiased`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
