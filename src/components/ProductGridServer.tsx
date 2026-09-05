import Link from "next/link";
import type { AggregatedProduct } from "@/lib/catalog-aggregate";

interface ProductGridServerProps {
  products: AggregatedProduct[];
  emptyMessage?: string;
}

export default function ProductGridServer({ products, emptyMessage = "ไม่พบสินค้า" }: ProductGridServerProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl text-white font-bold mb-2">{emptyMessage}</h2>
        <p className="text-white/50 text-sm">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่น</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((product) => (
        <Link
          key={product.slug}
          href={`/products/${product.slug}`}
          className="group block"
        >
          <div className="navy-card rounded-2xl overflow-hidden group-hover:border-acid-lime/50 transition-all duration-300 h-full flex flex-col relative">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-navy-deep/80">
              <img
                src={product.image_url || "/images/placeholder.svg"}
                alt={product.name_th || product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                width={400}
                height={400}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500" />
              {product.sale_price && (
                <div className="absolute top-3 left-3 bg-acid-lime text-navy-deep text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  -{Math.round((1 - product.min_price / product.sale_price) * 100)}%
                </div>
              )}
              {!product.has_stock && (
                <div className="absolute inset-0 bg-navy-deep/85 backdrop-blur-sm flex items-center justify-center">
                  <span className="px-4 py-1.5 rounded-full bg-navy-surface border border-navy-border text-white/80 font-bold text-xs tracking-wider uppercase">
                    สินค้าหมด
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between relative">
              <div>
                <h3 className="text-white font-bold text-base mb-1.5 line-clamp-1 group-hover:text-acid-lime transition-colors duration-300">
                  {product.name_th || product.name}
                </h3>
                <p className="text-white/50 text-xs line-clamp-2 leading-relaxed mb-4">
                  {product.brand_name_th || product.brand_name}
                  {product.puff_count ? ` • ${Number(product.puff_count).toLocaleString()} Puffs` : ""}
                </p>
              </div>

              <div className="flex items-end justify-between pt-3 border-t border-navy-border/60">
                <div>
                  <div className="text-xs text-white/40 font-mono mb-0.5">เริ่มต้น</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-acid-lime tracking-tight">฿{product.min_price.toLocaleString()}</span>
                    {product.sale_price && (
                      <span className="text-white/30 text-xs line-through">฿{product.sale_price.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {product.has_stock ? (
                  <div className="flex items-center gap-1.5 text-xs text-acid-lime font-mono bg-acid-lime/10 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-acid-lime animate-pulse" />
                    <span>{product.variant_count} รส</span>
                  </div>
                ) : (
                  <span className="text-xs text-white/30 font-mono bg-white/5 px-2.5 py-1 rounded-full">หมด</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
