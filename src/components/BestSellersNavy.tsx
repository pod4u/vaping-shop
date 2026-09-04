import Link from "next/link";
import Image from "next/image";

export default function BestSellersNavy() {
  const bestSellers = [
    {
      id: 1,
      rank: 1,
      name: "Marbo Ace",
      flavor: "Blueberry",
      price: 89,
      sold: 2847,
      image: "https://images.unsplash.com/photo-1560913210-81fb7a4e1b6e?w=300&h=300&fit=crop",
      badge: "🔥 ขายดีที่สุด",
    },
    {
      id: 2,
      rank: 2,
      name: "Mood X4",
      flavor: "Grape",
      price: 79,
      sold: 2156,
      image: "https://images.unsplash.com/photo-1560913210-81fb7a4e1b6e?w=300&h=300&fit=crop",
      badge: "⚡ ยอดฮิต",
    },
    {
      id: 3,
      rank: 3,
      name: "Alfa Pod",
      flavor: "Mango",
      price: 69,
      sold: 1923,
      image: "https://images.unsplash.com/photo-1560913210-81fb7a4e1b6e?w=300&h=300&fit=crop",
      badge: "🌟 แนะนำ",
    },
    {
      id: 4,
      rank: 4,
      name: "Vplus Prime",
      flavor: "Watermelon",
      price: 99,
      sold: 1678,
      image: "https://images.unsplash.com/photo-1560913210-81fb7a4e1b6e?w=300&h=300&fit=crop",
      badge: "✨ ใหม่มาแรง",
    },
  ];

  return (
    <section className="py-16 px-4 bg-navy-deep">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
              🔥 TOP SELLERS
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              สินค้า <span className="text-white-neon">ขายดี</span> ประจำเดือน
            </h2>
          </div>

          <Link
            href="/products"
            className="hidden sm:flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
          >
            ดูทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Best Sellers Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {bestSellers.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="vapor-card rounded-2xl overflow-hidden border border-navy-border hover:border-white/40 transition-all duration-300 group"
            >
              {/* Rank Badge */}
              <div className="relative">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-transparent opacity-60"></div>

                  {/* Rank Number */}
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-acid-lime text-navy-deep flex items-center justify-center font-black text-sm shadow-lg">
                    #{product.rank}
                  </div>

                  {/* Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-navy/80 backdrop-blur text-white text-xs font-bold border border-white/20">
                    {product.badge}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Name & Flavor */}
                <h3 className="text-white font-bold text-sm mb-1 group-hover:text-white-neon transition-colors">
                  {product.name}
                </h3>
                <p className="text-white/40 text-xs mb-3">{product.flavor}</p>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  {/* Price */}
                  <div className="text-acid-lime font-black text-sm">
                    ฿{product.price}
                  </div>

                  {/* Sold Count */}
                  <div className="text-white/40 text-xs flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {product.sold.toLocaleString()} ชิ้น
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
          >
            ดูสินค้าทั้งหมด
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}