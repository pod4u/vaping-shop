"use client";

interface SkeletonProps {
  className?: string;
}

// Base skeleton component
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <div className="vapor-card rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Image Skeleton */}
      <div className="relative aspect-square bg-brand-void/80">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3 mb-4" />
        </div>
        
        <div className="pt-3 border-t border-brand-border/60">
          <div className="flex items-end justify-between">
            <div>
              <Skeleton className="h-3 w-10 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Product Grid Skeleton
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Category Card Skeleton
export function CategoryCardSkeleton() {
  return (
    <div className="vapor-card rounded-2xl p-5 text-center h-full flex flex-col items-center justify-center">
      <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
      <Skeleton className="h-5 w-20 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Category Grid Skeleton
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Section Header Skeleton
export function SectionHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
      <div>
        <Skeleton className="h-4 w-24 mb-3 rounded-full" />
        <Skeleton className="h-10 w-48" />
      </div>
      <Skeleton className="h-4 w-32 mt-3 sm:mt-0" />
    </div>
  );
}

// Benefit Card Skeleton
export function BenefitCardSkeleton() {
  return (
    <div className="vapor-card rounded-2xl p-6 h-full">
      <Skeleton className="w-12 h-12 rounded-xl mb-5" />
      <Skeleton className="h-6 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// Benefit Grid Skeleton
export function BenefitGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <BenefitCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Hero Skeleton
export function HeroSkeleton() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-16">
      <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
        {/* Badge */}
        <Skeleton className="h-8 w-64 rounded-full mx-auto mb-8" />
        
        {/* Heading */}
        <Skeleton className="h-16 w-96 mx-auto mb-6" />
        <Skeleton className="h-16 w-72 mx-auto mb-10" />
        
        {/* Tagline */}
        <Skeleton className="h-6 w-96 mx-auto mb-10" />
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Skeleton className="h-14 w-48 rounded-full" />
          <Skeleton className="h-14 w-40 rounded-full" />
        </div>
        
        {/* Trust Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

// Header Skeleton
export function HeaderSkeleton() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="max-w-7xl mx-auto vapor-glass rounded-2xl px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <Skeleton className="h-6 w-32" />
            </div>
            
            <div className="hidden lg:flex items-center gap-8">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            
            <Skeleton className="hidden sm:block h-10 w-32 rounded-full" />
            <Skeleton className="lg:hidden w-10 h-10 rounded-xl" />
          </div>
        </div>
      </div>
    </header>
  );
}

// Full Page Loading Skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-brand-void">
      <HeaderSkeleton />
      <HeroSkeleton />
      
      {/* Categories Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeaderSkeleton />
          <CategoryGridSkeleton />
        </div>
      </section>
      
      {/* Featured Products Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeaderSkeleton />
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}