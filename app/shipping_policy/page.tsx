"use client";

import { useEffect, useState } from "react";

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
    <div className="min-h-screen bg-[#050505] text-[#f8f6f2] font-sans">
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
  color: rgba(255,255,255,0.03);
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
    rgba(255,255,255,0.015),
    rgba(255,255,255,0.005)
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
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 bg-gradient-to-b from-[#050505] to-transparent font-body backdrop-blur-md">
          <a
            href="/"
            className="font-display text-lg md:text-xl tracking-[0.35em] text-[#f8f6f2] uppercase no-underline gold-glow"
          >
            Exiles
          </a>

          <div className="flex items-center gap-5 md:gap-8">
            <a
              href="/shop"
              className="text-[10px] tracking-[0.2em] uppercase text-[#8f887c] hover:text-white transition-colors duration-300 no-underline"
            >
              Home
            </a>

            <a
              href="/shop"
              className="text-[10px] tracking-[0.2em] uppercase text-[#8f887c] hover:text-white transition-colors duration-300 no-underline hidden sm:block"
            >
              Shop
            </a>

            <a
              href="/cart"
              className="text-[10px] tracking-[0.18em] uppercase text-[#d4af73] border border-[#d4af73]/20 px-4 py-2 hover:bg-[#d4af73]/10 transition-all duration-300 no-underline rounded-full"
            >
              ← Cart
            </a>
          </div>
        </nav>

        {/* HEADER */}
        <header className="relative pt-36 md:pt-44 pb-16 px-6 md:px-12 border-b border-[#161616] overflow-hidden font-body">
          <span className="ghost-text">SHIPPING</span>

          <div className="relative max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-8 h-px bg-[#d4af73]" />

              <span className="text-[9px] tracking-[0.4em] uppercase text-[#d4af73] font-medium">
                Legal & Policies
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-light tracking-[0.1em] uppercase text-[#f8f6f2] leading-none mb-6 gold-glow">
              Shipping
              <br />
              Policy
            </h1>

            <p className="text-[13px] font-light text-[#8f887c] tracking-[0.06em] leading-loose max-w-md">
              Every garment dispatched with care. Below are our delivery terms
              for orders placed within Nigeria.
            </p>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-12 md:gap-16 font-body">
          {/* SIDEBAR */}
          <aside className="md:sticky md:top-24 self-start">
            <p className="text-[9px] tracking-[0.35em] uppercase text-[#5e564b] mb-5">
              On this page
            </p>

            <ul className="flex flex-row flex-wrap md:flex-col gap-2 md:gap-0 md:border-l md:border-[#1a1a1a]">
              {navItems.map(({ id, label }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    className={`text-left text-[10px] tracking-[0.12em] uppercase px-3 md:px-5 py-2 transition-all duration-300 border md:border-0 md:border-l-2 md:ml-[-1px] w-auto md:w-full
                    ${
                      activeSection === id
                        ? "text-white border-[#d4af73] bg-[#d4af73]/10 shadow-[0_0_20px_rgba(212,175,115,0.08)]"
                        : "text-[#8f887c] border-[#2a2a2a] hover:text-white hover:border-[#d4af73]"
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
              <p className="text-[9px] tracking-[0.3em] uppercase text-[#d4af73] mb-3">
                01 — Zones
              </p>

              <h2 className="font-display text-3xl md:text-4xl font-light tracking-[0.1em] uppercase text-[#f8f6f2] pb-4 border-b border-[#161616] mb-7 gold-glow">
                Delivery Zones & Rates
              </h2>

              <p className="text-[13px] font-light text-[#d6d1c7] tracking-[0.04em] leading-loose mb-6">
                We ship to all 36 states across Nigeria. Delivery fees are
                calculated based on your location zone and displayed at checkout
                before payment.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#1a1a1a]">
                      {["Zone", "Coverage", "Fee", "Timeframe"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[9px] tracking-[0.3em] uppercase text-[#8f887c] py-3 px-3 font-medium"
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
                        className="border-b border-[#1a1a1a]/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="font-display text-base text-[#f8f6f2] tracking-[0.08em] py-4 px-3">
                          {row.zone}
                        </td>

                        <td className="text-[12px] text-[#d6d1c7] tracking-[0.04em] py-4 px-3">
                          {row.coverage}
                        </td>

                        <td className="text-[12px] text-[#d6d1c7] tracking-[0.04em] py-4 px-3">
                          {row.fee}
                        </td>

                        <td className="text-[12px] text-[#d6d1c7] tracking-[0.04em] py-4 px-3">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="relative mt-8 glass-border px-8 py-6 overflow-hidden rounded-2xl">
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#d4af73]" />

                <p className="text-[9px] tracking-[0.35em] uppercase text-[#d4af73] mb-2">
                  ✦ Complimentary Shipping
                </p>

                <p className="text-[12px] font-light text-[#d6d1c7] leading-loose">
                  Orders above{" "}
                  <span className="text-[#f8f6f2]">₦100,000</span> qualify for
                  free nationwide delivery.
                </p>
              </div>
            </section>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-[#161616] px-6 md:px-12 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 font-body">
          <span className="font-display text-base tracking-[0.4em] text-[#5e564b] uppercase">
            Exiles
          </span>

          <span className="text-[10px] tracking-[0.12em] text-[#5e564b]">
            © 2025 Exiles. All rights reserved. Lagos, Nigeria.
          </span>
        </footer>
      </div>
    </div>
  );
}