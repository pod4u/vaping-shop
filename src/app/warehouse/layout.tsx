export const metadata = {
  title: "คลังสินค้า | Pod4U",
  robots: { index: false, follow: false },
};

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#071126] text-white">{children}</div>;
}
