import type { AggregatedProduct } from "@/lib/catalog-aggregate";
import ProductCatalogCard from "./ProductCatalogCard";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
      {products.map((product) => (
        <ProductCatalogCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
