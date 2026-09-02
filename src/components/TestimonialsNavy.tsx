export default function TestimonialsNavy() {
  const reviews = [
    {
      id: 1,
      name: "คุณแนน",
      avatar: "👩",
      rating: 5,
      product: "Marbo Ace",
      comment: "สินค้าดีมากค่ะ ส่งไว ได้รับภายใน 2 วัน ราคาถูกกว่าที่อื่น จะซื้อซ้ำแน่นอนค่ะ",
      date: "2026-08-28",
    },
    {
      id: 2,
      name: "คุณบอม",
      avatar: "👨",
      rating: 5,
      product: "Mood X4",
      comment: "ร้านนี้ประทับใจมาก สินค้าแท้ 100% บริการดี ตอบไว แนะนำเลยครับ",
      date: "2026-08-25",
    },
    {
      id: 3,
      name: "คุณจีน",
      avatar: "👩",
      rating: 5,
      product: "Alfa Pod",
      comment: "สั่งมาหลายครั้งแล้ว ไม่เคยผิดหวัง สต็อกพร้อมส่ง ไม่ต้องรอนาน ชอบมากค่ะ",
      date: "2026-08-22",
    },
    {
      id: 4,
      name: "คุณต้น",
      avatar: "👨",
      rating: 5,
      product: "Vplus Prime",
      comment: "ราคาส่งจริงครับ ซื้อ 10 ชิ้นลดเยอะ ส่งฟรีด้วย ประทับใจมาก!",
      date: "2026-08-20",
    },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? "text-yellow-400" : "text-white/20"}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <section className="py-16 px-4 bg-navy-surface">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            CUSTOMER REVIEWS
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            รีวิวจาก <span className="text-white-neon">ลูกค้าจริง</span>
          </h2>
          <p className="text-white/50 text-sm mt-2">
            ความประทับใจจากลูกค้าที่ไว้วางใจเรา
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="vapor-card rounded-2xl p-6 border border-navy-border hover:border-white/40 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-navy/30 border border-navy-border flex items-center justify-center text-2xl">
                    {review.avatar}
                  </div>

                  <div>
                    {/* Name */}
                    <h3 className="text-white font-bold text-sm">{review.name}</h3>
                    {/* Product */}
                    <p className="text-white/40 text-xs">{review.product}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-0.5">
                  {renderStars(review.rating)}
                </div>
              </div>

              {/* Comment */}
              <p className="text-white/70 text-sm leading-relaxed mb-4">
                "{review.comment}"
              </p>

              {/* Date */}
              <p className="text-white/30 text-xs font-mono">
                {new Date(review.date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="https://lin.ee/RU5qNLj"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep px-6 py-3 rounded-full text-sm font-bold hover:shadow-acid transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.58 2 10c0 2.12.92 4.04 2.42 5.44L3 22l6.4-3.2c.84.13 1.71.2 2.6.2 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
            </svg>
            สั่งซื้อเลย → รีวิวได้เลย
          </a>
        </div>
      </div>
    </section>
  );
}