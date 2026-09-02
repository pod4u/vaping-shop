"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    line_id: "",
    email: "",
    address: "",
    district: "",
    sub_district: "",
    province: "",
    postal_code: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "กรุณากรอกชื่อ-นามสกุล";
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";
    } else if (!/^0[0-9]{9}$/.test(formData.phone.replace(/-/g, ""))) {
      newErrors.phone = "รูปแบบเบอร์โทรไม่ถูกต้อง (0xxxxxxxxx)";
    }

    if (!formData.address.trim()) {
      newErrors.address = "กรุณากรอกบ้านเลขที่";
    }

    if (!formData.sub_district.trim()) {
      newErrors.sub_district = "กรุณากรอกเขต/อำเภอ";
    }

    if (!formData.province.trim()) {
      newErrors.province = "กรุณากรอกจังหวัด";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "รูปแบบ email ไม่ถูกต้อง";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // TODO: Connect to Supabase API
      const response = await fetch("/api/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert("สมัครสมาชิกสำเร็จ!");
        router.push("/");
      } else {
        alert(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4 bg-navy-deep">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
            📝 JOIN US
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            สมัคร<span className="text-white-neon">สมาชิก</span>
          </h1>
          <p className="text-white/50 text-sm">
            สมัครสมาชิกเพื่อรับสิทธิพิเศษและโปรโมชั่นพิเศษ
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="vapor-card rounded-2xl p-6 border border-navy-border">
            <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="text-lg">👤</span>
              ข้อมูลส่วนตัว
            </h2>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  ชื่อ-นามสกุล <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="สมชาย ใจดี"
                />
                {errors.full_name && (
                  <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  เบอร์โทรศัพท์ <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="081-234-5678"
                />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>

              {/* LINE ID */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  LINE ID <span className="text-white/30">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  name="line_id"
                  value={formData.line_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="@yourline"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  Email <span className="text-white/30">(ไม่บังคับ)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="email@example.com"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="vapor-card rounded-2xl p-6 border border-navy-border">
            <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="text-lg">📍</span>
              ที่อยู่จัดส่ง
            </h2>

            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  บ้านเลขที่/หมู่/ซอย/ถนน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="123/45 หมู่ 6 ซอยสุขุม ถนนสุขุมวิท"
                />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
              </div>

              {/* District */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  แขวง/ตำบล <span className="text-white/30">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="คลองตัน"
                />
              </div>

              {/* Sub District */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">
                    เขต/อำเภอ <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="sub_district"
                    value={formData.sub_district}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                    placeholder="วัฒนา"
                  />
                  {errors.sub_district && (
                    <p className="text-red-400 text-xs mt-1">{errors.sub_district}</p>
                  )}
                </div>

                <div>
                  <label className="block text-white/60 text-xs mb-1.5">
                    จังหวัด <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                    placeholder="กรุงเทพมหานคร"
                  />
                  {errors.province && (
                    <p className="text-red-400 text-xs mt-1">{errors.province}</p>
                  )}
                </div>
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">
                  รหัสไปรษณีย์ <span className="text-white/30">(ไม่บังคับ)</span>
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-navy-surface/50 border border-navy-border text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="10110"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-acid-lime to-[#a3e635] text-navy-deep py-4 rounded-full font-bold text-base hover:shadow-acid transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                กำลังบันทึก...
              </>
            ) : (
              <>✅ สมัครสมาชิก</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}