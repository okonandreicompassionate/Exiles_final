"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "../components/Logo";

export default function ShippingPolicy() {
  const [activeSection, setActiveSection] = useState("zones");

  useEffect(() => {
    const sections = document.querySelectorAll("section[id]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActiveSection(e.target.id);
          }
        });
      },
      {
        rootMargin: "-40% 0px -55% 0px",
      }
    );

    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { id: "zones", label: "Delivery Zones" },
    { id: "processing", label: "Processing Time" },
    { id: "tracking", label: "Order Tracking" },
    { id: "failed", label: "Failed Deliveries" },
    { id: "contact", label: "Contact" },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#18181b] font-sans">
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Montserrat:wght@200;300;400;500&display=swap');

.font-display {
  font-family: 'Cormorant Garamond', serif;
}

.font-body {
  font-family: 'Montserrat', sans-serif;
}

.grain::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.045'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  opacity: 0.28;
}

.ghost-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(64px, 14vw, 180px);
  font-weight: 300;
  letter-spacing: 0.18em;
  color: rgba(24,24,27,0.035);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.gold-glow {
  text-shadow:
    0 0 18px rgba(212,175,115,0.12),
    0 0 30px rgba(212,175,115,0.08);
}

.glass-border {
  border: 1px solid rgba(212,175,115,0.12);
  background: linear-gradient(
    to bottom,
    rgba(24,24,27,0.025),
    rgba(24,24,27,0.01)
  );
  backdrop-filter: blur(12px);
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up {
  animation: fadeUp 0.7s ease both;
}

.delay-1 { animation-delay: 0.08s; }
.delay-2 { animation-delay: 0.16s; }
.delay-3 { animation-delay: 0.24s; }
.delay-4 { animation-delay: 0.32s; }
.delay-5 { animation-delay: 0.40s; }
      `}</style>

      <div className="grain">
        {/* NAV */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-gradient-to-b from-[#ffffff] to-transparent font-body backdrop-blur-md">
          <a
            href="/"
            className="flex items-center gap-2.5 font-display text-lg md:text-xl tracking-[0.35em] text-[#18181b] uppercase no-underline gold-glow"
          >
            <LogoMark className="h-6 w-auto opacity-90" />
            Exiles
          </a>

          <div className="flex items-center gap-5 md:gap-8">
            <a
              href="/shop"
              className="text-[10px] tracking-[0.2em] uppercase text-[#71717a] hover:text-zinc-900 transition-colors duration-300 no-underline"
            >
              Home
            </a>

            <a
              href="/shop"
              className="text-[10px] tracking-[0.2em] uppercase text-[#71717a] hover:text-zinc-900 transition-colors duration-300 no-underline hidden sm:block"
            >
              Shop
            </a>

            <a
              href="/cart"
              className="text-[10px] tracking-[0.18em] uppercase text-[#9c7a3f] border border-[#d4af73]/20 px-4 py-2 hover:bg-[#d4af73]/10 transition-all duration-300 no-underline rounded-full"
            >
              ← Cart
            </a>
          </div>
        </nav>

        {/* HEADER */}
        <header className="relative pt-36 md:pt-44 pb-16 px-6 md:px-12 border-b border-[#e4e4e7] overflow-hidden font-body">
          <span className="ghost-text">SHIPPING</span>

          <div className="relative max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-8 h-px bg-[#d4af73]" />

              <span className="text-[9px] tracking-[0.4em] uppercase text-[#9c7a3f] font-medium">
                Legal & Policies
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light tracking-[0.1em] uppercase text-[#18181b] leading-none mb-6 gold-glow">
              Shipping
              <br />
              Policy
            </h1>

            <p className="text-[13px] font-light text-[#71717a] tracking-[0.06em] leading-loose max-w-md">
              Every garment dispatched with care. Below are our delivery terms
              for orders placed within Nigeria.
            </p>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12 md:gap-16 font-body">
          {/* SIDEBAR */}
          <aside className="md:sticky md:top-24 self-start">
            <p className="text-[9px] tracking-[0.35em] uppercase text-[#a1a1aa] mb-5">
              On this page
            </p>

            <ul className="flex flex-row flex-wrap md:flex-col gap-2 md:gap-0 md:border-l md:border-[#e4e4e7]">
              {navItems.map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    className={`text-left text-[10px] tracking-[0.12em] uppercase px-3 md:px-5 py-2 transition-all duration-300 border md:border-0 md:border-l-2 md:ml-[-1px] w-auto md:w-full
                    ${
                      activeSection === id
                        ? "text-zinc-900 border-[#d4af73] bg-[#d4af73]/10 shadow-[0_0_20px_rgba(212,175,115,0.08)]"
                        : "text-[#71717a] border-[#d4d4d8] hover:text-zinc-900 hover:border-[#d4af73]"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* CONTENT */}
          <div className="space-y-24">
            {/* SECTION */}
            <section id="zones" className="fade-up delay-1">
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#9c7a3f] mb-3">
                01 — Zones
              </p>

              <h2 className="font-display text-3xl md:text-4xl font-light tracking-[0.1em] uppercase text-[#18181b] pb-4 border-b border-[#e4e4e7] mb-7 gold-glow">
                Delivery Zones & Rates
              </h2>

              <p className="text-[13px] font-light text-[#52525b] tracking-[0.04em] leading-loose mb-6">
                We ship to all 36 states across Nigeria. Delivery fees are
                calculated based on your location zone and displayed at checkout
                before payment.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#e4e4e7]">
                      {["Zone", "Coverage", "Fee", "Timeframe"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[9px] tracking-[0.3em] uppercase text-[#71717a] py-3 px-3 font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {[
                      {
                        zone: "Lagos",
                        coverage: "All Lagos areas",
                        fee: "₦2,500 – ₦3,500",
                        time: "1 – 2 days",
                      },
                      {
                        zone: "Abuja / PH",
                        coverage: "FCT, Rivers State",
                        fee: "₦5,000 – ₦7,000",
                        time: "2 – 4 days",
                      },
                      {
                        zone: "Nationwide",
                        coverage: "All other states",
                        fee: "₦6,000 – ₦10,000",
                        time: "3 – 7 days",
                      },
                    ].map((row) => (
                      <tr
                        key={row.zone}
                        className="border-b border-[#e4e4e7]/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="font-display text-base text-[#18181b] tracking-[0.08em] py-4 px-3">
                          {row.zone}
                        </td>

                        <td className="text-[12px] text-[#52525b] tracking-[0.04em] py-4 px-3">
                          {row.coverage}
                        </td>

                        <td className="text-[12px] text-[#52525b] tracking-[0.04em] py-4 px-3">
                          {row.fee}
                        </td>

                        <td className="text-[12px] text-[#52525b] tracking-[0.04em] py-4 px-3">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="relative mt-8 glass-border px-8 py-6 overflow-hidden rounded-2xl">
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4af73]" />

                <p className="text-[9px] tracking-[0.35em] uppercase text-[#9c7a3f] mb-2">
                  ✦ Complimentary Shipping
                </p>

                <p className="text-[12px] font-light text-[#52525b] leading-loose">
                  Orders above{" "}
                  <span className="text-[#18181b]">₦100,000</span> qualify for
                  free nationwide delivery.
                </p>
              </div>
            </section>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#e4e4e7] px-6 md:px-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 font-body">
          <span className="flex items-center gap-2 font-display text-base tracking-[0.4em] text-[#a1a1aa] uppercase">
            <LogoMark className="h-5 w-auto opacity-50" />
            Exiles
          </span>

          <span className="text-[10px] tracking-[0.12em] text-[#a1a1aa]">
            © 2025 Exiles. All rights reserved. Lagos, Nigeria.
          </span>
        </footer>
      </div>
    </div>
  );
}