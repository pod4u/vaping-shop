import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { brands, getBrandBySlug } from '@/lib/brands';
import BrandPage from './BrandPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return brands.map(brand => ({
    slug: brand.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);

  if (!brand) {
    return {
      title: 'Brand Not Found',
    };
  }

  return {
    title: `${brand.name} - Pod4U`,
    description: brand.description,
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  return <BrandPage brand={brand} />;
}