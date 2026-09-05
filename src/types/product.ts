export interface Product {
  id: string | number;
  name: string;
  nameTh?: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  imageAlt?: string;
  description: string;
  features: string[];
  inStock: boolean;
  isFeatured: boolean;
  sku?: string;
  variantKey?: string;
  slug?: string;
  brandSlug?: string;
}

export type Category = {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  icon: string;
};
