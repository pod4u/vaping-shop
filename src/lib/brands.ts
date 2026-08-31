// Brand Data Configuration

export interface BrandFlavor {
  id: string;
  name: string;
  nameTh: string;
  image: string;
  color?: string;
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
    description: 'พอตใช้แล้วทิ้ง 20,000 Puffs ระบบ Dual Mesh Coil',
    color: '#3B82F6',
    puffCount: 20000,
    banner: '/images/brands/alfa/banner.webp',
    flavors: [
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/brands/alfa/blueberry.webp', color: '#4F46E5' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/brands/alfa/cola.webp', color: '#7C2D12' },
      { id: 'grape-ice', name: 'Grape Ice', nameTh: 'องุ่นไอซ์', image: '/images/brands/alfa/grape-ice.webp', color: '#9333EA' },
      { id: 'green-apple', name: 'Green Apple', nameTh: 'แอปเปิ้ลเขียว', image: '/images/brands/alfa/green-apple.webp', color: '#22C55E' },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/brands/alfa/lychee.webp', color: '#F472B6' },
      { id: 'mango-peach', name: 'Mango Peach', nameTh: 'มะม่วงพีช', image: '/images/brands/alfa/mango-peach.webp', color: '#F59E0B' },
      { id: 'mineral', name: 'Mineral', nameTh: 'มิเนรัล', image: '/images/brands/alfa/mineral.webp', color: '#94A3B8' },
      { id: 'mixberry', name: 'Mixberry', nameTh: 'มิกซ์เบอร์รี่', image: '/images/brands/alfa/mixberry.webp', color: '#8B5CF6' },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/brands/alfa/pineapple.webp', color: '#FCD34D' },
      { id: 'watermelon-ice', name: 'Watermelon Ice', nameTh: 'แตงโมไอซ์', image: '/images/brands/alfa/watermelon-ice.webp', color: '#EF4444' },
    ],
  },
  {
    id: 'marbo',
    slug: 'marbo',
    name: 'MARBO BAR 9K',
    nameTh: 'มาร์โบ 9K',
    description: 'พอตใช้แล้วทิ้ง 9,000 Puffs ราคาสบายกระเป๋า',
    color: '#EF4444',
    puffCount: 9000,
    flavors: [
      { id: 'apple-aloe', name: 'Apple Aloe', nameTh: 'แอปเปิ้ลอโลอี', image: '/images/brands/marbo/apple-aloe.webp', color: '#22C55E' },
      { id: 'blue', name: 'Blue', nameTh: 'บลู', image: '/images/brands/marbo/blue.webp', color: '#3B82F6' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/brands/marbo/cola.webp', color: '#7C2D12' },
      { id: 'double-mint', name: 'Double Mint', nameTh: 'ดับเบิ้ลมิ้นท์', image: '/images/brands/marbo/double-mint.webp', color: '#22D3EE' },
      { id: 'grape-aloe', name: 'Grape Aloe', nameTh: 'องุ่นอโลอี', image: '/images/brands/marbo/grape-aloe.webp', color: '#9333EA' },
      { id: 'grape-lychee', name: 'Grape Lychee', nameTh: 'องุ่นลิ้นจี่', image: '/images/brands/marbo/grape-lychee.webp', color: '#A855F7' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/brands/marbo/grape.webp', color: '#9333EA' },
      { id: 'mixberry', name: 'Mixberry', nameTh: 'มิกซ์เบอร์รี่', image: '/images/brands/marbo/mixberry.webp', color: '#8B5CF6' },
      { id: 'orange-sour', name: 'Orange Sour', nameTh: 'ส้มเปรี้ยว', image: '/images/brands/marbo/orange-sour.webp', color: '#F97316' },
      { id: 'peach-strawberry', name: 'Peach Strawberry', nameTh: 'พีชสตรอว์เบอร์รี่', image: '/images/brands/marbo/peach-strawberry.webp', color: '#F472B6' },
      { id: 'peach', name: 'Peach', nameTh: 'พีช', image: '/images/brands/marbo/peach.webp', color: '#FB923C' },
      { id: 'pink-berry', name: 'Pink Berry', nameTh: 'พิงค์เบอร์รี่', image: '/images/brands/marbo/pink-berry.webp', color: '#EC4899' },
      { id: 'rainbow-candy', name: 'Rainbow Candy', nameTh: 'เรนโบว์แคนดี้', image: '/images/brands/marbo/rainbow-candy.webp', color: '#EC4899' },
      { id: 'sour-gummy', name: 'Sour Gummy', nameTh: 'เปรี้ยวกัมมี่', image: '/images/brands/marbo/sour-gummy.webp', color: '#84CC16' },
      { id: 'sparkling-lemon', name: 'Sparkling Lemon', nameTh: 'สปาร์กลิงเลมอน', image: '/images/brands/marbo/sparkling-lemon.webp', color: '#FDE047' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/brands/marbo/strawberry.webp', color: '#EF4444' },
      { id: 'watermelon-bubble', name: 'Watermelon Bubblegum', nameTh: 'แตงโมบับเบิ้ลกัม', image: '/images/brands/marbo/watermelon-bubble.webp', color: '#EF4444' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/brands/marbo/watermelon.webp', color: '#EF4444' },
    ],
  },
  {
    id: 'mood',
    slug: 'mood',
    name: 'MOOD 14K',
    nameTh: 'มูด 14K',
    description: 'พอตใช้แล้วทิ้ง 14,000 Puffs ดีไซน์สวย รสชาติเยอะ',
    color: '#EC4899',
    puffCount: 14000,
    flavors: [
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/brands/mood/blueberry.webp', color: '#4F46E5' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/brands/mood/cola.webp', color: '#7C2D12' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/brands/mood/grape.webp', color: '#9333EA' },
      { id: 'lemon-tea', name: 'Lemon Tea', nameTh: 'ชาเลมอน', image: '/images/brands/mood/lemon-tea.webp', color: '#FDE047' },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/brands/mood/lychee.webp', color: '#F472B6' },
      { id: 'mint', name: 'Mint', nameTh: 'มิ้นท์', image: '/images/brands/mood/mint.webp', color: '#22D3EE' },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/brands/mood/pineapple.webp', color: '#FCD34D' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/brands/mood/strawberry.webp', color: '#EF4444' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/brands/mood/watermelon.webp', color: '#EF4444' },
      { id: 'peach-orange', name: 'Peach Orange', nameTh: 'พีชออเรนจ์', image: '/images/brands/mood/peach-orange.webp', color: '#FB923C' },
    ],
  },
  {
    id: 'vplus',
    slug: 'vplus',
    name: 'V-PLUS 16K',
    nameTh: 'วีพลัส 16K',
    description: 'พอตใช้แล้วทิ้ง 16,000 Puffs พลังงานสูง รสชาติจัดจ้าน',
    color: '#10B981',
    puffCount: 16000,
    flavors: [
      { id: 'mint', name: 'Mint', nameTh: 'มิ้นท์', image: '/images/brands/vplus/mint.jpg', color: '#22D3EE' },
      { id: 'watermelon-bubblegum', name: 'Watermelon Bubblegum', nameTh: 'แตงโมบับเบิ้ลกัม', image: '/images/brands/vplus/watermelon-bubblegum.jpg', color: '#EF4444' },
      { id: 'apple', name: 'Apple', nameTh: 'แอปเปิ้ล', image: '/images/brands/vplus/apple.jpg', color: '#22C55E' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/brands/vplus/strawberry.jpg', color: '#EF4444' },
      { id: 'lychee', name: 'Lychee', nameTh: 'ลิ้นจี่', image: '/images/brands/vplus/lychee.jpg', color: '#F472B6' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/brands/vplus/grape.jpg', color: '#9333EA' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/brands/vplus/watermelon.jpg', color: '#EF4444' },
      { id: 'strawberry-raspberry', name: 'Strawberry Raspberry', nameTh: 'สตรอว์เบอร์รี่ราสเบอร์รี่', image: '/images/brands/vplus/strawberry-raspberry.jpg', color: '#EF4444' },
      { id: 'apple-sugus', name: 'Apple Sugus', nameTh: 'แอปเปิ้ลซูกัส', image: '/images/brands/vplus/apple-sugus.jpg', color: '#22C55E' },
      { id: 'rainbow-candy', name: 'Rainbow Candy', nameTh: 'เรนโบว์แคนดี้', image: '/images/brands/vplus/rainbow-candy.jpg', color: '#EC4899' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/brands/vplus/cola.jpg', color: '#7C2D12' },
      { id: 'mixed-berries-bubblegum', name: 'Mixed Berries Bubblegum', nameTh: 'มิกซ์เบอร์รี่บับเบิ้ลกัม', image: '/images/brands/vplus/mixed-berries-bubblegum.jpg', color: '#8B5CF6' },
      { id: 'blueberry', name: 'Blueberry', nameTh: 'บลูเบอร์รี่', image: '/images/brands/vplus/blueberry.jpg', color: '#4F46E5' },
      { id: 'gummy-bear', name: 'Gummy Bear', nameTh: 'กัมมี่แบร์', image: '/images/brands/vplus/gummy-bear.jpg', color: '#EC4899' },
      { id: 'peach-strawberry', name: 'Peach Strawberry', nameTh: 'พีชสตรอว์เบอร์รี่', image: '/images/brands/vplus/peach-strawberry.jpg', color: '#F472B6' },
      { id: 'watermelon-strawberry', name: 'Watermelon Strawberry', nameTh: 'แตงโมสตรอว์เบอร์รี่', image: '/images/brands/vplus/watermelon-strawberry.jpg', color: '#EF4444' },
      { id: 'peach', name: 'Peach', nameTh: 'พีช', image: '/images/brands/vplus/peach.jpg', color: '#FB923C' },
      { id: 'grape-2', name: 'Grape', nameTh: 'องุ่น', image: '/images/brands/vplus/grape-2.jpg', color: '#9333EA' },
    ],
  },
  {
    id: 'eskobar',
    slug: 'eskobar',
    name: 'ESKO BAR SWITCH 20K',
    nameTh: 'เอสโกบาร์ 20K',
    description: 'พอตใช้แล้วทิ้ง 20,000 Puffs ระบบ Dual Mesh Coil ปรับโหมดได้',
    color: '#F59E0B',
    puffCount: 20000,
    flavors: [
      { id: 'pink-guava', name: 'Pink Guava', nameTh: 'พิงค์กัววา', image: '/images/brands/eskobar/pink-guava.webp', color: '#F472B6' },
      { id: 'pineapple', name: 'Pineapple', nameTh: 'สับปะรด', image: '/images/brands/eskobar/pineapple.webp', color: '#FCD34D' },
      { id: 'strawberry', name: 'Strawberry', nameTh: 'สตรอว์เบอร์รี่', image: '/images/brands/eskobar/strawberry.webp', color: '#EF4444' },
      { id: 'strawberry-banana', name: 'Strawberry Banana', nameTh: 'สตรอว์เบอร์รี่กล้วย', image: '/images/brands/eskobar/strawberry-banana.webp', color: '#FCD34D' },
      { id: 'watermelon-ice', name: 'Watermelon Ice', nameTh: 'แตงโมไอซ์', image: '/images/brands/eskobar/watermelon-ice.webp', color: '#EF4444' },
      { id: 'watermelon-lime', name: 'Watermelon Lime', nameTh: 'แตงโมไลม์', image: '/images/brands/eskobar/watermelon-lime.webp', color: '#84CC16' },
    ],
  },
  {
    id: 'mbar',
    slug: 'mbar',
    name: 'M BAR 10K',
    nameTh: 'เอ็มบาร์ 10K',
    description: 'พอตใช้แล้วทิ้ง 10,000 Puffs 3 โหมด ECO/SOFT/BOOST',
    color: '#8B5CF6',
    puffCount: 10000,
    flavors: [
      { id: 'watermelon-mint', name: 'Watermelon Mint', nameTh: 'แตงโมมิ้นท์', image: '/images/brands/mbar/watermelon-mint.webp', color: '#EF4444' },
      { id: 'menthol-blast', name: 'Menthol Blast', nameTh: 'เมนทอลบลาสท์', image: '/images/brands/mbar/menthol-blast.webp', color: '#22D3EE' },
      { id: 'strawberry-kiwi', name: 'Strawberry Kiwi', nameTh: 'สตรอว์เบอร์รี่คีวี่', image: '/images/brands/mbar/strawberry-kiwi.webp', color: '#84CC16' },
      { id: 'cola', name: 'Cola', nameTh: 'โคล่า', image: '/images/brands/mbar/cola.webp', color: '#7C2D12' },
      { id: 'all-berry', name: 'All Berry', nameTh: 'ออลเบอร์รี่', image: '/images/brands/mbar/all-berry.webp', color: '#8B5CF6' },
      { id: 'watermelon', name: 'Watermelon', nameTh: 'แตงโม', image: '/images/brands/mbar/watermelon.webp', color: '#EF4444' },
      { id: 'grape', name: 'Grape', nameTh: 'องุ่น', image: '/images/brands/mbar/grape.webp', color: '#9333EA' },
      { id: 'pink-berry', name: 'Pink Berry', nameTh: 'พิงค์เบอร์รี่', image: '/images/brands/mbar/pink-berry.webp', color: '#EC4899' },
      { id: 'kyoho-grape', name: 'Kyoho Grape', nameTh: 'เคียวโฮ', image: '/images/brands/mbar/kyoho-grape.webp', color: '#7C3AED' },
    ],
  },
  {
    id: 'relx',
    slug: 'relx',
    name: 'RELX PRO 2',
    nameTh: 'เรลแซกโปร 2',
    description: 'พอตระบบที่ได้รับความนิยมสูง สินค้าคุณภาพ',
    color: '#06B6D4',
    puffCount: 0,
    flavors: [
      { id: 'mint-freeze', name: 'Mint Freeze', nameTh: 'มิ้นท์ฟรีซ', image: '/images/brands/relx/mint-freeze.webp', color: '#22D3EE' },
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