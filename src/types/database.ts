// Database Types for Pod4U

export interface Brand {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  name_th: string;
  description: string | null;
  icon: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Flavor {
  id: string;
  slug: string;
  name: string;
  name_th: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_key: string;
  sku: string | null;
  slug: string;
  name: string;
  name_th: string | null;
  brand_id: string | null;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  puff_count: number | null;
  nicotine_level: number | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sort_order: number;
  // Relations
  brand?: Brand;
  category?: Category;
  flavors?: ProductFlavor[];
}

export interface ProductFlavor {
  id: string;
  product_id: string;
  flavor_id: string;
  variant_key: string;
  sku: string;
  nicotine_level: number | null;
  price: number;
  sale_price: number | null;
  image_path: string;
  image_url: string;
  image_alt_en: string | null;
  image_alt_th: string | null;
  stock_quantity: number;
  is_available: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  flavor?: Flavor;
  product?: Product;
}

export interface StockLog {
  id: string;
  product_flavor_id: string;
  action: 'ADD' | 'REMOVE' | 'SOLD';
  quantity: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  line_user_id: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string | null;
  payment_slip_url: string | null;
  payment_verified: boolean;
  payment_verified_at: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  flavor_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  // Relations
  product?: Product;
  flavor?: Flavor;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface LineMessage {
  id: string;
  customer_id: string | null;
  line_user_id: string | null;
  message_type: 'TEXT' | 'IMAGE' | 'STICKER';
  message_text: string | null;
  direction: 'INCOMING' | 'OUTGOING';
  is_processed: boolean;
  ai_response: string | null;
  created_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface StockDisplay {
  brand: Brand;
  products: {
    product: Product;
    availableFlavors: {
      flavor: Flavor;
      stock_quantity: number;
    }[];
  }[];
}

export interface StockSummary {
  totalProducts: number;
  totalFlavors: number;
  totalStock: number;
  brands: {
    brand: Brand;
    productCount: number;
    flavorCount: number;
    stockCount: number;
  }[];
}
