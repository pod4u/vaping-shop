"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { storeConfig, categories } from "../lib/config";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseEnter = () => {
    if (dropdownTimeout) {
      clearTimeout(dropdownTimeout);
      setDropdownTimeout(null);
    }
    setIsDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 150);
    setDropdownTimeout(timeout);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4 transition-all duration-300">
        <div className={`max-w-7xl mx-auto rounded-2xl px-6 py-3.5 transition-all duration-500 ${
          isScrolled
            ? "bg-brand-void/80 backdrop-blur-xl border border-brand-border shadow-2xl shadow-black/40"
            : "vapor-glass"
        }`}>
          {/* Ambient glow effect when scrolled */}
          {isScrolled && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-vapor-violet/20 rounded-full blur-[60px]"></div>
            </div>
          )}

          <div className="flex items-center justify-between relative z-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-vapor-violet/20 border border-vapor-violet/50 flex items-center justify-center group-hover:border-acid-lime group-hover:shadow-lg group-hover:shadow-acid-lime/20 transition-all duration-300">
                <span className="text-xl">💨</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                VAPING <span className="text-acid-lime font-black">SHOP</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                href="/"
                className="text-white/80 hover:text-acid-lime transition-colors font-medium text-sm tracking-wide relative group"
              >
                หน้าแรก
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-acid-lime group-hover:w-full transition-all duration-300"></span>
              </Link>

              {/* Products Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button className="text-white/80 hover:text-acid-lime transition-colors flex items-center gap-1.5 font-medium text-sm tracking-wide relative group">
                  สินค้าทั้งหมด
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-acid-lime' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-acid-lime group-hover:w-full transition-all duration-300"></span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 pt-3 w-80 animate-scale-in">
                    <div className="vapor-card rounded-2xl p-2.5 shadow-2xl border border-brand-border overflow-hidden relative">
                      {/* Ambient light in dropdown */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-vapor-violet/20 rounded-full blur-[40px] pointer-events-none"></div>

                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/products?category=${cat.id}`}
                          className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-brand-surface-hover transition-all group relative"
                        >
                          <span className="text-xl p-2 rounded-lg bg-vapor-violet/10 border border-brand-border group-hover:border-acid-lime/40 group-hover:shadow-lg group-hover:shadow-acid-lime/10 transition-all">{cat.icon}</span>
                          <div>
                            <div className="text-white font-medium text-sm group-hover:text-acid-lime transition-colors">{cat.nameTh}</div>
                            <div className="text-white/40 text-xs tracking-wider uppercase font-mono">{cat.name}</div>
                          </div>
                        </Link>
                      ))}

                      <div className="border-t border-brand-border mt-2 pt-2">
                        <Link
                          href="/products"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-brand-surface-hover transition-all text-acid-lime font-medium text-sm"
                        >
                          ดูสินค้าทั้งหมด
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/products"
                className="text-white/80 hover:text-acid-lime transition-colors font-medium text-sm tracking-wide relative group"
              >
                โปรโมชั่นพิเศษ
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-acid-lime group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/#about"
                className="text-white/80 hover:text-acid-lime transition-colors font-medium text-sm tracking-wide relative group"
              >
                เกี่ยวกับเรา
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-acid-lime group-hover:w-full transition-all duration-300"></span>
              </Link>
            </nav>

            {/* LINE Button */}
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 btn-acid px-5 py-2.5 rounded-full text-sm font-bold transition-all btn-press"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              ติดต่อ LINE
            </a>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-brand-border mt-4 animate-slide-up">
              <nav className="flex flex-col gap-2">
                <Link href="/" className="text-white/80 hover:text-acid-lime py-2.5 px-4 rounded-xl transition-all hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
                  หน้าแรก
                </Link>
                <Link href="/products" className="text-white/80 hover:text-acid-lime py-2.5 px-4 rounded-xl transition-all hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
                  สินค้าทั้งหมด
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="text-white/60 hover:text-acid-lime py-2 pl-8 px-4 rounded-xl transition-all text-sm flex items-center gap-2 hover:bg-white/5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>{cat.icon}</span> {cat.nameTh}
                  </Link>
                ))}
                <a
                  href={storeConfig.lineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 btn-acid px-4 py-3 rounded-full mt-3 font-bold"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                  ติดต่อผ่าน LINE
                </a>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}