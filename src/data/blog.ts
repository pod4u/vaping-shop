import { BlogPost } from "@/types/blog";

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Pod และ Mod ต่างกันอย่างไร?",
    excerpt: "มือใหม่หัดสูบ ไม่รู้จะเลือก Pod หรือ Mod ดี มาดูความแตกต่างกัน...",
    image: "/images/products/alfa/duo-mesh-20k/banner.webp",
    date: "2026-08-20",
    category: "ความรู้",
    slug: "pod-vs-mod-difference",
  },
  {
    id: 2,
    title: "วิธีแก้พอตขาดวงจร (Short Circuit)",
    excerpt: "พอตขาดวงจรทำไง? มาดูวิธีแก้ไขและป้องกันกันครับ...",
    image: "/images/products/esko-bar/switch-20k/watermelon-ice.webp",
    date: "2026-08-18",
    category: "Tips",
    slug: "fix-pod-short-circuit",
  },
  {
    id: 3,
    title: "ทำไมต้องซื้อจากร้านเรา?",
    excerpt: "รับประกันสินค้า บริการ 24 ชม. ส่งฟรีเมื่อซื้อครบ 800...",
    image: "/hero-bg.png",
    date: "2026-08-15",
    category: "รีวิวร้าน",
    slug: "why-choose-our-shop",
  },
];

export const getBlogPostBySlug = (slug: string) =>
  blogPosts.find((p) => p.slug === slug);
