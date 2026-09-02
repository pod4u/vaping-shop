import { Product } from "@/types/product";

export const products: Product[] = [
  // Disposable Pods
  {
    id: 1,
    name: "RELX Pro 2 - Mint Freeze",
    category: "flavor-pod",
    price: 200,
    image: "/images/products/relx/pro-2/mint-freeze.webp",
    description: "หัวพอต RELX Pro 2 รสมินต์เย็น นิโคติน 5%",
    features: ["RELX Pro 2", "Mint Freeze", "5% Nicotine"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: 2,
    name: "ALFA Duo Mesh 20K - Blueberry",
    category: "disposable-pod",
    price: 400,
    image: "/images/products/alfa/duo-mesh-20k/blueberry.webp",
    description: "พอตใช้แล้วทิ้ง ALFA Duo Mesh 20K รสบลูเบอร์รี่",
    features: ["20,000 Puffs", "Duo Mesh", "Blueberry"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: 3,
    name: "Esko Bar Switch 20K",
    category: "disposable-pod",
    price: 350,
    image: "/images/products/esko-bar/switch-20k/pink-guava.webp",
    description: "พอตใช้แล้วทิ้ง 20,000 พัฟฟ์ ดีไซน์สวยงาม",
    features: ["20,000 Puffs", "Sleek Design", "หลากหลายรสชาติ"],
    inStock: true,
    isFeatured: true,
  },
  {
    id: 4,
    name: "MOOOD Monster Series 14K - Grape",
    category: "disposable-pod",
    price: 350,
    image: "/images/products/moood/monster-series-14k/grape.webp",
    description: "พอตใช้แล้วทิ้ง MOOOD Monster Series 14K รสองุ่น",
    features: ["14,000 Puffs", "Duo Mesh", "Grape"],
    inStock: true,
    isFeatured: true,
  },
  // Pod Systems
  {
    id: 5,
    name: "VOOPOO ARGUS P1",
    category: "pod-system",
    price: 890,
    originalPrice: 990,
    image: "/products/voopo-argus.jpg",
    description: "พอตไฟฟ้ารุ่นใหม่ แบตเตอรี่ 800mAh จอแสดงผล",
    features: ["800mAh Battery", "PnP Coil", "Display Screen"],
    inStock: true,
    isFeatured: false,
  },
  {
    id: 6,
    name: "SMOK NOVO 4",
    category: "pod-system",
    price: 790,
    image: "/products/smok-novo4.jpg",
    description: "พอตไฟฟ้าคลาสสิก ปรับลมได้",
    features: ["800mAh Battery", "Adjustable Airflow", "LP1 Coil"],
    inStock: true,
    isFeatured: false,
  },
  {
    id: 7,
    name: "UWELL CALIBURN G2",
    category: "pod-system",
    price: 850,
    image: "/products/uwell-g2.jpg",
    description: "พอตไฟฟ้าขายดี รสชาติชัดเจน",
    features: ["750mAh Battery", "Pro-FOCS Tech", "Feather Airflow"],
    inStock: true,
    isFeatured: false,
  },
  // Coils
  {
    id: 8,
    name: "SMOK LP1 Coil (4pcs)",
    category: "coil-cartridge",
    price: 190,
    image: "/products/smok-lp1.jpg",
    description: "คอยล์ SMOK LP1 สำหรับ Novo 4, Nord 4",
    features: ["4 ชิ้น/กล่อง", "0.8Ω, 1.0Ω", "Pro Mesh"],
    inStock: true,
    isFeatured: false,
  },
  {
    id: 9,
    name: "VOOPOO PnP Coil (4pcs)",
    category: "coil-cartridge",
    price: 220,
    image: "/products/voopo-pnp.jpg",
    description: "คอยล์ VOOPOO PnP ใช้ได้หลายรุ่น",
    features: ["4 ชิ้น/กล่อง", "0.6Ω - 1.2Ω", "Mesh Coil"],
    inStock: true,
    isFeatured: false,
  },
  // E-Liquids
  {
    id: 10,
    name: "Nasty Juice Salt 30ml",
    category: "salt nic",
    price: 290,
    image: "/products/nasty-salt.jpg",
    description: "น้ำยาซอลนิคจากมาเลเซีย รสชาติเข้มข้น",
    features: ["30ml", "35mg/50mg", "Brand: Nasty Juice"],
    inStock: true,
    isFeatured: false,
  },
  {
    id: 11,
    name: "Dinner Lady Freebase 60ml",
    category: "freebase",
    price: 450,
    image: "/products/dinner-lady.jpg",
    description: "น้ำยาฟรีเบสจาก UK คุณภาพสูง",
    features: ["60ml", "3mg/6mg", "Brand: Dinner Lady"],
    inStock: true,
    isFeatured: false,
  },
];

export const featuredProducts = products.filter((p) => p.isFeatured);

export const getProductsByCategory = (category: string) =>
  products.filter((p) => p.category === category);

export const getProductById = (id: number) =>
  products.find((p) => p.id === id);
