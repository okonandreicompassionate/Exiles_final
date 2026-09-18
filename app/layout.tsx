import localFont from "next/font/local";
import { Raleway, Bebas_Neue } from "next/font/google";
import { CartProvider } from "./components/cartProvider";
import { ToastProvider } from "./components/toastProvider";
import { WishlistProvider } from "./components/wishlistProvider";
import "./globals.css";

const coolvetica = localFont({
  src: "../public/fonts/CoolveticaRg-Regular V2.woff2",
  variable: "--font-coolvetica",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "EXILES COMPROMISED",
  description:
    "Premium fashion brand - Timeless style crafted for modern expression",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${coolvetica.variable} ${raleway.variable} ${bebasNeue.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${raleway.className} bg-white text-zinc-900 antialiased`}
      >
        {/* Ambient blurred color blobs — the surface every glass panel blurs against */}
        <div className="ambient-bg" aria-hidden="true">
          <div className="ambient-blob ambient-blob-1" />
          <div className="ambient-blob ambient-blob-2" />
          <div className="ambient-blob ambient-blob-3" />
        </div>
        <ToastProvider>
          <WishlistProvider>
            <CartProvider>
              <div className="relative z-[1]">{children}</div>
            </CartProvider>
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
