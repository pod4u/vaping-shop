import { Package, Users, Shield, Sparkles } from "lucide-react";

export default function SocialProofNavy() {
  const benefits = [
    {
      icon: Package,
      label: "สินค้าพร้อมส่ง",
      description: "สต็อกจริง ตรวจสอบได้",
    },
    {
      icon: Users,
      label: "สมาชิกฟรี",
      description: "สมัครง่าย ใช้เลย",
    },
    {
      icon: Shield,
      label: "สินค้าแท้ 100%",
      description: "รับประกันคุณภาพ",
    },
    {
      icon: Sparkles,
      label: "สินค้าหลากหลาย",
      description: "หลายแบรนด์ หลายรุ่น",
    },
  ];

  return (
    <section className="py-12 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Benefits Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="navy-card rounded-2xl p-6 text-center transition-all duration-300 group relative overflow-hidden"
            >
              {/* Top Curved Arc Dome Glow */}
              <div 
                className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 rounded-[100%] blur-[24px] opacity-30 group-hover:opacity-75 group-hover:scale-125 transition-all duration-500 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(138, 171, 255, 0.7) 0%, rgba(43, 95, 255, 0.3) 50%, transparent 80%)'
                }}
              ></div>

              {/* Dual-Layer 3D Liquid Glass Squircle */}
              <div className="flex justify-center mb-4 relative z-10">
                <div className="glass-squircle-container w-14 h-14">
                  <div className={`glass-squircle-back ${index % 2 === 0 ? 'lime' : 'cyan'}`}></div>
                  <div className="glass-squircle-front w-full h-full flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] group-hover:text-acid-lime group-hover:scale-110 transition-all duration-300" />
                  </div>
                </div>
              </div>

              {/* Label */}
              <div className="text-white font-bold text-sm mb-1 relative z-10">
                {benefit.label}
              </div>

              {/* Description */}
              <div className="text-white/40 text-xs relative z-10">
                {benefit.description}
              </div>
            </div>
          ))}
        </div>

        {/* Trust Message */}
        <div className="mt-8 text-center">
          <p className="text-white/40 text-xs font-mono">
            ✅ ร้านเปิดให้บริการทุกวัน ไม่มีวันหยุด
          </p>
        </div>
      </div>
    </section>
  );
}