import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-brand-void flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black text-white mb-4">404</h1>
        <p className="text-xl text-white/60 mb-2">ไม่พบแบรนด์นี้</p>
        <p className="text-white/40 mb-8">Brand not found</p>
        
        <Link
          href="/brands"
          className="btn-acid px-6 py-3 rounded-full font-bold inline-flex items-center gap-2"
        >
          <span>ดูแบรนด์ทั้งหมด</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}