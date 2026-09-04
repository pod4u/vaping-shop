// Brand Data Configuration

export interface BrandFlavor {
  id: string;
  name: string;
  nameTh: string;
  image: string;
  color?: string;
  nicotinePercent?: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  nameTh: string;
  description: string;
  color: string;
  puffCount: number;
  logo?: string;
  banner?: string;
  flavors: BrandFlavor[];
}

export const brands: Brand[] = [
  {
    id: 'alfa',
    slug: 'alfa',
    name: 'ALFA DUO MESH 20K',
    nameTh: 'อัลฟา 20K',
    description: 'พอดใช้แล้วทิ้ง 20,000 Puffs ระบบ Dual Mesh Coil',
    color: '#3B82F6',
    puffCount: 20000,
    banner: '/images/products/alfa/duo-mesh-20k/banner.webp',
    flavors: [
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/products/alfa/duo-mesh-20k/blueberry.webp', color: '#4F46E5' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/products/alfa/duo-mesh-20k/cola.webp', color: '#7C2D12' },
      { id: 'grape-ice', name: 'Grape Ice', nameTh: 'องุ่นไอซ์', image: '/images/products/alfa/duo-mesh-20k/grape-ice.webp', color: '#9333EA' },
      { id: 'green-apple', name: 'Green Apple', nameTh: 'แอปเปิ้ลเขียว', image: '/images/products/alfa/duo-mesh-20k/green-apple.webp', color: '#22C55E' },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/products/alfa/duo-mesh-20k/lychee.webp', color: '#F472B6' },
      { id: 'mango-peach', name: 'Mango Peach', nameTh: 'มะม่วงพีช', image: '/images/products/alfa/duo-mesh-20k/mango-peach.webp', color: '#F59E0B' },
      { id: 'mineral', name: 'Mineral', nameTh: 'มิเนรัล', image: '/images/products/alfa/duo-mesh-20k/mineral.webp', color: '#94A3B8' },
      { id: 'mixberry', name: 'Mixberry', nameTh: 'มิกซ์เบอร์รี่', image: '/images/products/alfa/duo-mesh-20k/mixberry.webp', color: '#8B5CF6' },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/products/alfa/duo-mesh-20k/pineapple.webp', color: '#FCD34D' },
      { id: 'watermelon-ice', name: 'Watermelon Ice', nameTh: 'แตงโมไอซ์', image: '/images/products/alfa/duo-mesh-20k/watermelon-ice.webp', color: '#EF4444' },
    ],
  },
  {
    id: 'marbo',
    slug: 'marbo',
    name: 'MARBO M BAR 9K',
    nameTh: 'มาร์โบ 9K',
    description: 'พอดใช้แล้วทิ้ง 9,000 Puffs ราคาสบายกระเป๋า',
    color: '#EF4444',
    puffCount: 9000,
    flavors: [
      { id: 'apple-aloe', name: 'Apple Aloe', nameTh: 'แอปเปิ้ลอโลอี', image: '/images/products/marbo/m-bar-9k/apple-aloe.webp', color: '#22C55E' },
      { id: 'blue-ice', name: 'Blue Ice', nameTh: 'บลูไอซ์', image: '/images/products/marbo/m-bar-9k/blue-ice.webp', color: '#3B82F6' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/products/marbo/m-bar-9k/cola.webp', color: '#7C2D12' },
      { id: 'double-mint', name: 'Double Mint', nameTh: 'ดับเบิ้ลมิ้นท์', image: '/images/products/marbo/m-bar-9k/double-mint.webp', color: '#22D3EE' },
      { id: 'grape-aloe', name: 'Grape Aloe', nameTh: 'องุ่นอโลอี', image: '/images/products/marbo/m-bar-9k/grape-aloe.webp', color: '#9333EA' },
      { id: 'grape-lychee', name: 'Grape Lychee', nameTh: 'องุ่นลิ้นจี่', image: '/images/products/marbo/m-bar-9k/grape-lychee.webp', color: '#A855F7' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/products/marbo/m-bar-9k/grape.webp', color: '#9333EA' },
      { id: 'mixberry', name: 'Mixberry', nameTh: 'มิกซ์เบอร์รี่', image: '/images/products/marbo/m-bar-9k/mixberry.webp', color: '#8B5CF6' },
      { id: 'orange-sour', name: 'Orange Sour', nameTh: 'ส้มเปรี้ยว', image: '/images/products/marbo/m-bar-9k/orange-sour.webp', color: '#F97316' },
      { id: 'peach-strawberry', name: 'Peach Strawberry', nameTh: 'พีชสตรอว์เบอร์รี่', image: '/images/products/marbo/m-bar-9k/peach-strawberry.webp', color: '#F472B6' },
      { id: 'peach', name: 'Peach', nameTh: 'พีช', image: '/images/products/marbo/m-bar-9k/peach.webp', color: '#FB923C' },
      { id: 'pink-berry', name: 'Pink Berry', nameTh: 'พิงค์เบอร์รี่', image: '/images/products/marbo/m-bar-9k/pink-berry.webp', color: '#EC4899' },
      { id: 'rainbow-candy', name: 'Rainbow Candy', nameTh: 'เรนโบว์แคนดี้', image: '/images/products/marbo/m-bar-9k/rainbow-candy.webp', color: '#EC4899' },
      { id: 'sour-gummy', name: 'Sour Gummy', nameTh: 'เปรี้ยวกัมมี่', image: '/images/products/marbo/m-bar-9k/sour-gummy.webp', color: '#84CC16' },
      { id: 'sparkling-lemon', name: 'Sparkling Lemon', nameTh: 'สปาร์กลิงเลมอน', image: '/images/products/marbo/m-bar-9k/sparkling-lemon.webp', color: '#FDE047' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/products/marbo/m-bar-9k/strawberry.webp', color: '#EF4444' },
      { id: 'watermelon-bubblegum', name: 'Watermelon Bubblegum', nameTh: 'แตงโมบับเบิ้ลกัม', image: '/images/products/marbo/m-bar-9k/watermelon-bubblegum.webp', color: '#EF4444' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/products/marbo/m-bar-9k/watermelon.webp', color: '#EF4444' },
    ],
  },
  {
    id: 'mood',
    slug: 'mood',
    name: 'MOOOD 14K',
    nameTh: 'มูด 14K',
    description: 'พอดใช้แล้วทิ้ง 14,000 Puffs ดีไซน์สวย รสชาติเยอะ',
    color: '#EC4899',
    puffCount: 14000,
    flavors: [
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/products/moood/monster-series-14k/blueberry.webp', color: '#4F46E5', nicotinePercent: 3 },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/products/moood/monster-series-14k/cola.webp', color: '#7C2D12', nicotinePercent: 3 },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/products/moood/monster-series-14k/grape-5.jpg', color: '#9333EA', nicotinePercent: 5 },
      { id: 'kyoho-grape', name: 'Kyoho Grape', nameTh: 'องุ่นเคียวโฮ', image: '/images/products/moood/monster-series-14k/kyoho-grape-3.jpg', color: '#7C3AED', nicotinePercent: 3 },
      { id: 'lemon-tea', name: 'Lemon Tea', nameTh: 'ชาเลมอน', image: '/images/products/moood/monster-series-14k/lemon-tea.webp', color: '#FDE047', nicotinePercent: 3 },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/products/moood/monster-series-14k/lychee.webp', color: '#F472B6', nicotinePercent: 3 },
      { id: 'mint', name: 'Mint', nameTh: 'มิ้นท์', image: '/images/products/moood/monster-series-14k/mint.webp', color: '#22D3EE', nicotinePercent: 3 },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/products/moood/monster-series-14k/pineapple.webp', color: '#FCD34D', nicotinePercent: 3 },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/products/moood/monster-series-14k/strawberry.webp', color: '#EF4444', nicotinePercent: 3 },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/products/moood/monster-series-14k/watermelon.webp', color: '#EF4444', nicotinePercent: 3 },
      { id: 'peach-orange', name: 'Peach Orange', nameTh: 'พีชออเรนจ์', image: '/images/products/moood/monster-series-14k/peach-orange.webp', color: '#FB923C', nicotinePercent: 3 },
    ],
  },
  {
    id: 'vplus',
    slug: 'vplus',
    name: 'V-PLUS 16K',
    nameTh: 'วีพลัส 16K',
    description: 'พอดใช้แล้วทิ้ง 16,000 Puffs พลังงานสูง รสชาติจัดจ้าน',
    color: '#10B981',
    puffCount: 16000,
    flavors: [
      { id: 'mint', name: 'Mint', nameTh: 'มิ้นท์', image: '/images/products/vplus/16k/mint.jpg', color: '#22D3EE' },
      { id: 'watermelon-bubblegum', name: 'Watermelon Bubblegum', nameTh: 'แตงโมบับเบิ้ลกัม', image: '/images/products/vplus/16k/watermelon-bubblegum.jpg', color: '#EF4444' },
      { id: 'apple', name: 'Apple', nameTh: 'แอปเปิ้ล', image: '/images/products/vplus/16k/apple.jpg', color: '#22C55E' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/products/vplus/16k/strawberry.jpg', color: '#EF4444' },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/products/vplus/16k/lychee.jpg', color: '#F472B6' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/products/vplus/16k/grape.jpg', color: '#9333EA' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/products/vplus/16k/watermelon.jpg', color: '#EF4444' },
      { id: 'strawberry-raspberry', name: 'Strawberry Raspberry', nameTh: 'สตรอว์เบอร์รี่ราสเบอร์รี่', image: '/images/products/vplus/16k/strawberry-raspberry.jpg', color: '#EF4444' },
      { id: 'apple-sugus', name: 'Apple Sugus', nameTh: 'แอปเปิ้ลซูกัส', image: '/images/products/vplus/16k/apple-sugus.jpg', color: '#22C55E' },
      { id: 'rainbow-candy', name: 'Rainbow Candy', nameTh: 'เรนโบว์แคนดี้', image: '/images/products/vplus/16k/rainbow-candy.jpg', color: '#EC4899' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/products/vplus/16k/cola.jpg', color: '#7C2D12' },
      { id: 'mixed-berries-bubblegum', name: 'Mixed Berries Bubblegum', nameTh: 'มิกซ์เบอร์รี่บับเบิ้ลกัม', image: '/images/products/vplus/16k/mixed-berries-bubblegum.jpg', color: '#8B5CF6' },
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/products/vplus/16k/blueberry.jpg', color: '#4F46E5' },
      { id: 'gummy-bear', name: 'Gummy Bear', nameTh: 'กัมมี่แบร์', image: '/images/products/vplus/16k/gummy-bear.jpg', color: '#EC4899' },
      { id: 'peach-strawberry', name: 'Peach Strawberry', nameTh: 'พีชสตรอว์เบอร์รี่', image: '/images/products/vplus/16k/peach-strawberry.jpg', color: '#F472B6' },
      { id: 'watermelon-strawberry', name: 'Watermelon Strawberry', nameTh: 'แตงโมสตรอว์เบอร์รี่', image: '/images/products/vplus/16k/watermelon-strawberry.jpg', color: '#EF4444' },
      { id: 'kyoho-grape', name: 'Kyoho Grape', nameTh: 'องุ่นเคียวโฮ', image: '/images/products/vplus/16k/kyoho-grape.jpg', color: '#7C3AED' },
      { id: 'grape-alt', name: 'Grape', nameTh: 'องุ่นยาว', image: '/images/products/vplus/16k/grape-alt.jpg', color: '#9333EA' },
    ],
  },
  {
    id: 'eskobar',
    slug: 'eskobar',
    name: 'ESKO BAR SWITCH 20K',
    nameTh: 'เอสโกบาร์ 20K',
    description: 'พอดใช้แล้วทิ้ง 20,000 Puffs ระบบ Dual Mesh Coil ปรับโหมดได้',
    color: '#F59E0B',
    puffCount: 20000,
    flavors: [
      { id: 'pink-guava', name: 'Pink Guava', nameTh: 'พิงค์กัววา', image: '/images/products/esko-bar/switch-20k/pink-guava.webp', color: '#F472B6' },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/products/esko-bar/switch-20k/pineapple.webp', color: '#FCD34D' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/products/esko-bar/switch-20k/strawberry.webp', color: '#EF4444' },
      { id: 'strawberry-banana', name: 'Strawberry Banana', nameTh: 'สตรอว์เบอร์รี่กล้วย', image: '/images/products/esko-bar/switch-20k/strawberry-banana.webp', color: '#FCD34D' },
      { id: 'watermelon-ice', name: 'Watermelon Ice', nameTh: 'แตงโมไอซ์', image: '/images/products/esko-bar/switch-20k/watermelon-ice.webp', color: '#EF4444' },
      { id: 'watermelon-lime', name: 'Watermelon Lime', nameTh: 'แตงโมไลม์', image: '/images/products/esko-bar/switch-20k/watermelon-lime.webp', color: '#84CC16' },
    ],
  },
  {
    id: 'mbar',
    slug: 'mbar',
    name: 'M BAR 10K',
    nameTh: 'เอ็มบาร์ 10K',
    description: 'พอดใช้แล้วทิ้ง 10,000 Puffs 3 โหมด ECO/SOFT/BOOST',
    color: '#8B5CF6',
    puffCount: 10000,
    flavors: [
      { id: 'watermelon-mint', name: 'Watermelon Mint', nameTh: 'แตงโมมิ้นท์', image: '/images/products/mbar/m-bar-10k/watermelon-mint.webp', color: '#EF4444' },
      { id: 'menthol-blast', name: 'Menthol Blast', nameTh: 'เมนทอลบลาสท์', image: '/images/products/mbar/m-bar-10k/menthol-blast.webp', color: '#22D3EE' },
      { id: 'strawberry-kiwi', name: 'Strawberry Kiwi', nameTh: 'สตรอว์เบอร์รี่คีวี่', image: '/images/products/mbar/m-bar-10k/strawberry-kiwi.webp', color: '#84CC16' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/products/mbar/m-bar-10k/cola.webp', color: '#7C2D12' },
      { id: 'all-berry', name: 'All Berry', nameTh: 'ออลเบอร์รี่', image: '/images/products/mbar/m-bar-10k/all-berry.webp', color: '#8B5CF6' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/products/mbar/m-bar-10k/watermelon.webp', color: '#EF4444' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/products/mbar/m-bar-10k/grape.webp', color: '#9333EA' },
      { id: 'pink-berry', name: 'Pink Berry', nameTh: 'พิงค์เบอร์รี่', image: '/images/products/mbar/m-bar-10k/pink-berry.webp', color: '#EC4899' },
      { id: 'kyoho-grape', name: 'Kyoho Grape', nameTh: 'องุ่นเคียวโฮ', image: '/images/products/mbar/m-bar-10k/kyoho-grape.webp', color: '#7C3AED' },
    ],
  },
  {
    id: 'relx',
    slug: 'relx',
    name: 'RELX PRO 2',
    nameTh: 'รีแล็กซ์โปร 2',
    description: 'พอดระบบที่ได้รับความนิยมสูง สินค้าคุณภาพ',
    color: '#06B6D4',
    puffCount: 0,
    flavors: [
      { id: 'mint-freeze', name: 'Mint Freeze', nameTh: 'มิ้นท์ฟรีซ', image: '/images/products/relx/pro-2/mint-freeze.webp', color: '#22D3EE' },
    ],
  },
];

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find(b => b.slug === slug);
}

export function getBrandFlavors(brandSlug: string, flavorIds: string[]): BrandFlavor[] {
  const brand = getBrandBySlug(brandSlug);
  if (!brand) return [];
  return brand.flavors.filter(f => flavorIds.includes(f.id));
}
