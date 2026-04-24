import { Inter } from "next/font/google";
import Script from "next/script";
import { CartProvider } from "./components/cartProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <Script
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />
        <Script
          id="tailwind-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    animation: {
                      'slow-zoom': 'slowZoom 20s ease-out forwards',
                      'fade-in-up': 'fadeInUp 1s ease-out forwards',
                    },
                    keyframes: {
                      slowZoom: {
                        '0%': { transform: 'scale(1)' },
                        '100%': { transform: 'scale(1.1)' },
                      },
                      fadeInUp: {
                        '0%': { opacity: '0', transform: 'translateY(20px)' },
                        '100%': { opacity: '1', transform: 'translateY(0)' },
                      },
                    },
                  },
                },
              }
            `,
          }}
        />
      </head>

      <body className="font-sans bg-white text-white antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
