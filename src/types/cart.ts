// Cart Types for Draft Cart (localStorage only)

export interface CartItem {
  productFlavorId: string;
  sku: string | null;
  variantKey: string | null;
  productName: string;
  productNameTh: string | null;
  flavorName: string;
  flavorNameTh: string | null;
  brandName: string;
  brandNameTh: string | null;
  imageUrl: string | null;
  unitPrice: number | null;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  version: number;
  editingOrderId?: string | null;
  editingOrderNumber?: string | null;
}

export const CART_STORAGE_KEY = 'pod4u_draft_cart_v1';
export const CART_VERSION = 1;
export const MAX_QUANTITY_PER_ITEM = 99;
