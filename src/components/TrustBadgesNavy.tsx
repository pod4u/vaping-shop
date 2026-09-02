export default function TrustBadgesNavy() {
  const badges = [
    {
      icon: "💳",
      title: "ชำระเงินหลายช่องทาง",
      items: ["พร้อมเพย์", "โอนเงิน", "COD"],
    },
    {
      icon: "📦",
      title: "จัดส่งรวดเร็ว",
      items: ["EMS", "Flash", "Kerry"],
    },
    {
      icon: "✅",
      title: "รับประกันคุณภาพ",
      items: ["สินค้าแท้ 100%", "เปลี่ยนคืนได้"],
    },
    {
      icon: "🔒",
      title: "ปลอดภัย 100%",
      items: ["ข้อมูลปลอดภัย", "ส่งฟรี 800฿+"],
    },
  ];

  return (
    <section className="py-16 px-4 bg-navy-deep">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            WHY CHOOSE US
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            ทำไมต้องเลือก <span className="text-white-neon">เรา</span>
          </h2>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="vapor-card rounded-2xl p-6 border border-navy-border text-center hover:border-white/40 transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {badge.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-sm mb-3">
                {badge.title}
              </h3>

              {/* Items */}
              <div className="space-y-1.5">
                {badge.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-white/60 text-xs flex items-center justify-center gap-1.5"
                  >
                    <svg
                      className="w-3 h-3 text-acid-lime flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}