export default function TrustBadgesNavy() {
  const badges = [
    {
      icon: "💳",
      title: "ชำระเงินหลายช่องทาง",
      items: ["พร้อมเพย์", "โอนเงิน"],
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
      items: ["ข้อมูลปลอดภัย", "ดูดแล้วทิ้ง 3 ชิ้นส่งฟรี"],
    },
  ];

  return (
    <section className="py-16 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            WHY CHOOSE US
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            ทำไมต้องเลือก <span className="text-blue-400">เรา</span>
          </h2>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="navy-card rounded-2xl p-6 text-center transition-all duration-300 group relative overflow-hidden"
            >
              {/* Top Curved Arc Dome Glow */}
              <div 
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-[100%] blur-[28px] opacity-30 group-hover:opacity-75 group-hover:scale-125 transition-all duration-500 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(138, 171, 255, 0.7) 0%, rgba(43, 95, 255, 0.3) 50%, transparent 80%)'
                }}
              ></div>

              {/* Dual-Layer 3D Liquid Glass Squircle */}
              <div className="glass-squircle-container w-16 h-16 mb-4">
                <div className={`glass-squircle-back ${index % 2 === 1 ? 'lime' : ''}`}></div>
                <div className="glass-squircle-front w-full h-full flex items-center justify-center text-3xl">
                  <span className="relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transform group-hover:scale-110 transition-transform duration-300">
                    {badge.icon}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-sm mb-3 relative z-10 group-hover:text-acid-lime transition-colors">
                {badge.title}
              </h3>

              {/* Items */}
              <div className="space-y-1.5 relative z-10">
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

