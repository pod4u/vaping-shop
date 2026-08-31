export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  features: string[];
  inStock: boolean;
  isFeatured: boolean;
}

export type Category = {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  icon: string;
};