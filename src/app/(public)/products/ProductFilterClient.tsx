"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { categories } from "@/lib/config";
import { bilingualNameThai } from "@/lib/bilingual";

interface BrandOption {
  slug: string;
  name: string;
  name_th: string | null;
}

interface ProductFilterClientProps {
  selectedCategory: string | null;
  selectedBrand: string | null;
  selectedPuffs: string | null;
  selectedStock: string | null;
  selectedSort: string | null;
  searchQuery: string;
  brands: BrandOption[];
  puffCounts: number[];
}

const sortOptions = [
  { value: "", label: "แนะนำ" },
  { value: "price-asc", label: "ราคา ต่ำ–สูง" },
  { value: "price-desc", label: "ราคา สูง–ต่ำ" },
  { value: "puffs", label: "จำนวนพัฟ" },
  { value: "name-az", label: "ชื่อ A–Z" },
];

export default function ProductFilterClient({
  selectedCategory,
  selectedBrand,
  selectedPuffs,
  selectedStock,
  selectedSort,
  searchQuery,
  brands,
  puffCounts,
}: ProductFilterClientProps) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Sync localSearch with URL searchQuery on navigation (back/forward)
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const buildUrl = useCallback((overrides: Record<string, string | null>) => {
    const current: Record<string, string | null> = {
      category: selectedCategory,
      brand: selectedBrand,
      puffs: selectedPuffs,
      stock: selectedStock,
      sort: selectedSort,
      // Use localSearch (current input) when building URL
      search: localSearch.trim() || null,
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(current)) {
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }, [selectedCategory, selectedBrand, selectedPuffs, selectedStock, selectedSort, localSearch]);

  const applyFilter = useCallback((overrides: Record<string, string | null>) => {
    router.push(buildUrl(overrides));
  }, [router, buildUrl]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localSearch.trim();
    applyFilter({ search: trimmed || null });
  };

  const clearAll = () => {
    setLocalSearch("");
    router.push("/products");
  };

  const hasFilters = !!(selectedCategory || selectedBrand || selectedPuffs || selectedStock || selectedSort || searchQuery);

  const pillBase = "px-4 py-2 rounded-full text-xs font-bold transition-all";
  const pillActive = "bg-acid-lime text-navy-deep shadow-acid-sm";
  const pillInactive = "bg-navy-surface/50 border border-navy-border text-white/70 hover:border-acid-lime/40 hover:text-white";

  return (
    <div className="space-y-4">
      {/* Search + Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            aria-label="ค้นหาสินค้า"
            placeholder="ค้นหาแบรนด์ รุ่น หรือรสชาติ (ไทย / English)"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-navy-surface/50 border border-navy-border rounded-xl px-5 py-3.5 pl-12 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-acid-lime text-sm"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>
        <select
          value={selectedSort || ""}
          onChange={(e) => applyFilter({ sort: e.target.value || null })}
          className="bg-navy-surface/50 border border-navy-border rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-acid-lime appearance-none cursor-pointer min-w-[160px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em' }}
          aria-label="เรียงลำดับสินค้า"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-navy-deep text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Category Pills */}
      <div>
        <div className="text-white/40 text-xs font-mono mb-2 uppercase tracking-wider">ประเภท</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyFilter({ category: null })}
            className={`${pillBase} ${!selectedCategory ? pillActive : pillInactive}`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => applyFilter({ category: selectedCategory === cat.id ? null : cat.id })}
              className={`${pillBase} ${selectedCategory === cat.id ? pillActive : pillInactive}`}
            >
              {cat.icon} {bilingualNameThai(cat.nameTh, cat.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Pills */}
      {brands.length > 0 && (
        <div>
          <div className="text-white/40 text-xs font-mono mb-2 uppercase tracking-wider">แบรนด์</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyFilter({ brand: null })}
              className={`${pillBase} ${!selectedBrand ? pillActive : pillInactive}`}
            >
              ทุกแบรนด์
            </button>
            {brands.map((b) => (
              <button
                key={b.slug}
                onClick={() => applyFilter({ brand: selectedBrand === b.slug ? null : b.slug })}
                className={`${pillBase} ${selectedBrand === b.slug ? pillActive : pillInactive}`}
              >
                {b.name}
                {b.name_th ? ` · ${b.name_th}` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Puff Count Pills */}
      {puffCounts.length > 0 && (
        <div>
          <div className="text-white/40 text-xs font-mono mb-2 uppercase tracking-wider">จำนวนพัฟ</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyFilter({ puffs: null })}
              className={`${pillBase} ${!selectedPuffs ? pillActive : pillInactive}`}
            >
              ทุกขนาด
            </button>
            {puffCounts.map((pc) => {
              const val = pc.toString();
              const label = pc >= 1000 && pc % 1000 === 0 ? `${pc / 1000}K` : pc.toLocaleString();
              return (
                <button
                  key={pc}
                  onClick={() => applyFilter({ puffs: selectedPuffs === val ? null : val })}
                  className={`${pillBase} ${selectedPuffs === val ? pillActive : pillInactive}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock + Clear Row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => applyFilter({ stock: selectedStock === "in" ? null : "in" })}
          className={`${pillBase} ${selectedStock === "in" ? pillActive : pillInactive}`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${selectedStock === "in" ? "bg-navy-deep" : "bg-acid-lime"} animate-pulse`} />
            พร้อมส่งเท่านั้น
          </span>
        </button>

        {hasFilters && (
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-full text-xs font-bold text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>
    </div>
  );
}