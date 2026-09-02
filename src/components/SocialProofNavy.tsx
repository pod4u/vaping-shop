export default function SocialProofNavy() {
  const stats = [
    {
      number: "10,000+",
      label: "ชิ้น",
      description: "ขายแล้ว",
      icon: "📦",
    },
    {
      number: "500+",
      label: "คน",
      description: "ลูกค้าไว้วางใจ",
      icon: "👥",
    },
    {
      number: "4.9",
      label: "/ 5.0",
      description: "คะแนนรีวิว",
      icon: "⭐",
    },
    {
      number: "50+",
      label: "แบรนด์",
      description: "สินค้าหลากหลาย",
      icon: "🏷️",
    },
  ];

  return (
    <section className="py-12 px-4 bg-navy-deep">
      <div className="max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="vapor-card rounded-2xl p-6 border border-navy-border text-center hover:border-white/40 transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {stat.icon}
              </div>

              {/* Number */}
              <div className="text-white-neon text-3xl sm:text-4xl font-black mb-1">
                {stat.number}
              </div>

              {/* Label */}
              <div className="text-white/60 text-sm mb-1">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-white/40 text-xs">
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Message */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-xs font-mono">
            ✅ ลูกค้าไว้วางใจเราตั้งแต่ 2024
          </p>
        </div>
      </div>
    </section>
  );
}