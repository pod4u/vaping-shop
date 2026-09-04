"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { storeConfig, categories } from "../lib/config";

export default function HeaderNavy() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsMenuOpen(false);
    }
  };

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
            ? "bg-navy-deep/80 backdrop-blur-xl border border-navy-border shadow-2xl shadow-black/40"
            : "navy-glass"
        }`}>
          {isScrolled && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-32 h-32 bg-navy-glow/20 rounded-full blur-[60px]"></div>
            </div>
          )}

          <div className="flex items-center justify-between relative z-10">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-navy/30 border border-navy-border-light/50 flex items-center justify-center group-hover:border-white/40 group-hover:shadow-lg group-hover:shadow-white/10 transition-all duration-300">
                <span className="text-xl">💨</span>
              </div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                VAPING <span className="text-white-neon font-black">SHOP</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <Link
                href="/"
                className="text-white/80 hover:text-white transition-colors font-medium text-sm tracking-wide relative group"
              >
                หน้าแรก
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>

              {/* Products Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <button className="text-white/80 hover:text-white transition-colors flex items-center gap-1.5 font-medium text-sm tracking-wide relative group">
                  สินค้าทั้งหมด
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 pt-3 w-80 animate-scale-in">
                    <div className="navy-card rounded-2xl p-2.5 shadow-2xl border border-navy-border overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-navy-glow/20 rounded-full blur-[40px] pointer-events-none"></div>

                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/products?category=${cat.id}`}
                          className="flex items-center gap-3.5 px-4 py-3 rounded-xl hover:bg-navy-surface-hover transition-all group relative"
                        >
                          <span className="text-xl p-2 rounded-lg bg-navy/20 border border-navy-border group-hover:border-white/40 group-hover:shadow-lg group-hover:shadow-white/10 transition-all">{cat.icon}</span>
                          <div>
                            <div className="text-white font-medium text-sm group-hover:text-white transition-colors">{cat.nameTh}</div>
                            <div className="text-white/40 text-xs tracking-wider uppercase font-mono">{cat.name}</div>
                          </div>
                        </Link>
                      ))}

                      <div className="border-t border-navy-border mt-2 pt-2">
                        <Link
                          href="/products"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-navy-surface-hover transition-all text-white font-medium text-sm"
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
                className="text-white/80 hover:text-white transition-colors font-medium text-sm tracking-wide relative group"
              >
                โปรโมชั่นพิเศษ
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link
                href="/#about"
                className="text-white/80 hover:text-white transition-colors font-medium text-sm tracking-wide relative group"
              >
                เกี่ยวกับเรา
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
              </Link>

              <Link
                href="/register"
                className="text-acid-lime hover:text-white transition-colors font-bold text-sm tracking-wide"
              >
                สมัครสมาชิก
              </Link>
            </nav>

            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาสินค้า..."
                  className="w-48 xl:w-64 px-4 py-2 pl-10 rounded-full bg-navy-surface/50 border border-navy-border text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* LINE Button */}
            <a
              href={storeConfig.lineLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:shadow-acid hover:scale-105"
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
            <div className="lg:hidden py-4 border-t border-navy-border mt-4 animate-slide-up">
              {/* Search Bar - Mobile */}
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาสินค้า..."
                    className="w-full px-4 py-3 pl-10 rounded-xl bg-navy-surface/50 border border-navy-border text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>

              <nav className="flex flex-col gap-2">
                <Link href="/" className="text-white/80 hover:text-white py-2.5 px-4 rounded-xl transition-all hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
                  หน้าแรก
                </Link>
                <Link href="/products" className="text-white/80 hover:text-white py-2.5 px-4 rounded-xl transition-all hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>
                  สินค้าทั้งหมด
                </Link>
                <Link href="/register" className="text-acid-lime hover:text-white py-2.5 px-4 rounded-xl transition-all hover:bg-white/5 font-bold" onClick={() => setIsMenuOpen(false)}>
                  สมัครสมาชิก
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.id}`}
                    className="text-white/60 hover:text-white py-2 pl-8 px-4 rounded-xl transition-all text-sm flex items-center gap-2 hover:bg-white/5"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>{cat.icon}</span> {cat.nameTh}
                  </Link>
                ))}
                <a
                  href={storeConfig.lineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-4 py-3 rounded-full mt-3 font-bold shadow-acid"
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