"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { categories } from "@/lib/config";

interface CategoryItem {
  id: string;
  name: string;
  nameTh: string;
  icon: string;
}

interface ProductFilterClientProps {
  selectedCategory: string | null;
  searchQuery: string;
  categories: readonly CategoryItem[];
}

export default function ProductFilterClient({
  selectedCategory,
  searchQuery,
  categories,
}: ProductFilterClientProps) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [localCategory, setLocalCategory] = useState(selectedCategory);

  const updateFilters = (newCategory: string | null, newSearch: string) => {
    const params = new URLSearchParams();
    if (newCategory) params.set("category", newCategory);
    if (newSearch) params.set("search", newSearch);
    const qs = params.toString();
    router.push(`/products${qs ? `?${qs}` : ""}`);
  };

  const handleCategoryChange = (catId: string | null) => {
    setLocalCategory(catId);
    updateFilters(catId, localSearch);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(localCategory, localSearch);
  };

  return (
    <div>
      {/* Search + Category Select */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหารุ่นสินค้า, กลิ่น, รสชาติ..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-navy-surface/50 border border-navy-border rounded-xl px-5 py-3.5 pl-12 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-acid-lime text-sm"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-5 py-2 rounded-full text-xs font-bold font-mono tracking-wider transition-all ${
            !localCategory
              ? "bg-acid-lime text-navy-deep shadow-acid-sm"
              : "bg-navy-surface/50 border border-navy-border text-white/70 hover:border-acid-lime/40 hover:text-white"
          }`}
        >
          ALL (ทั้งหมด)
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
              localCategory === cat.id
                ? "bg-acid-lime text-navy-deep shadow-acid-sm"
                : "bg-navy-surface/50 border border-navy-border text-white/70 hover:border-acid-lime/40 hover:text-white"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.nameTh}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
