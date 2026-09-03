import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Client for browser (public access with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Server client with service role (admin access)
export const getServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// ============================================
// Helper Functions
// ============================================

export async function getBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  
  if (error) throw error;
  return data;
}

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  
  if (error) throw error;
  return data;
}

export async function getFlavors() {
  const { data, error } = await supabase
    .from('flavors')
    .select('*')
    .eq('is_active', true)
    .order('name_th');
  
  if (error) throw error;
  return data;
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      category:categories(*),
      flavors:product_flavors(
        *,
        flavor:flavors(*)
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getProductsByBrand(brandId: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      flavors:product_flavors(
        *,
        flavor:flavors(*)
      )
    `)
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getAvailableStock(): Promise<{
  brands: { brand: any; products: any[] }[];
}> {
  // Get all brands
  const { data: brands, error: brandsError } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  
  if (brandsError) throw brandsError;

  // Get products with available flavors
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      flavors:product_flavors(
        *,
        flavor:flavors(*)
      )
    `)
    .eq('is_active', true);
  
  if (productsError) throw productsError;

  // Filter and organize by brand
  const result = brands.map(brand => {
    const brandProducts = products
      .filter(p => p.brand_id === brand.id)
      .map(product => {
        const availableFlavors = product.flavors?.filter(
          (pf: any) => pf.is_available && pf.stock_quantity > 0
        ) || [];
        
        return {
          ...product,
          availableFlavors,
        };
      })
      .filter(p => p.availableFlavors.length > 0);
    
    return {
      brand,
      products: brandProducts,
    };
  }).filter(b => b.products.length > 0);

  return { brands: result };
}

// Fuzzy search for products
export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands(*),
      flavors:product_flavors(
        *,
        flavor:flavors(*)
      )
    `)
    .or(`name.ilike.%${query}%,name_th.ilike.%${query}%`)
    .eq('is_active', true);
  
  if (error) throw error;
  return data;
}

// Search flavors
export async function searchFlavors(query: string) {
  const { data, error } = await supabase
    .from('flavors')
    .select('*')
    .or(`name.ilike.%${query}%,name_th.ilike.%${query}%`)
    .eq('is_active', true);

  if (error) throw error;
  return data;
}

// ============================================
// Types for E-Commerce
// ============================================

export interface Customer {
  id: number
  phone: string
  name: string | null
  line_user_id: string | null
  email: string | null
  created_at: string
}

export interface Address {
  id: number
  customer_id: number
  name: string
  phone: string
  address: string
  province: string | null
  postal_code: string | null
  is_default: boolean
}

export interface Order {
  id: number
  customer_id: number
  total_price: number
  discount: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number: string | null
  created_at: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: string
  flavor_id: string
  quantity: number
  price: number
  created_at: string
}

// ============================================
// Customer Functions
// ============================================

export async function createCustomer(data: {
  phone: string
  name?: string
  line_user_id?: string
  email?: string
}) {
  const { data: customer, error } = await getServerSupabase()
    .from('customers')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return customer;
}

export async function registerCustomer(data: {
  full_name: string
  phone: string
  line_id?: string
  email?: string
  address: string
  district?: string
  sub_district: string
  province: string
  postal_code?: string
}) {
  const { data: customer, error } = await getServerSupabase()
    .from('customers')
    .insert({
      phone: data.phone,
      name: data.full_name,
      line_user_id: data.line_id || null,
      email: data.email || null,
    })
    .select()
    .single();

  if (error) {
    // Check for duplicate phone
    if (error.code === '23505') {
      throw new Error('เบอร์โทรนี้เคยสมัครแล้ว');
    }
    throw error;
  }

  return customer;
}

export async function getAllCustomers() {
  const { data, error } = await getServerSupabase()
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCustomerByPhone(phone: string) {
  const { data, error } = await getServerSupabase()
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getCustomerByLineUserId(lineUserId: string) {
  const { data, error } = await getServerSupabase()
    .from('customers')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================
// Order Functions
// ============================================

export async function createOrder(data: {
  customer_id: number
  total_price: number
  discount?: number
  items: {
    product_id: string
    flavor_id: string
    quantity: number
    price: number
  }[]
}) {
  // Start a transaction-like flow
  const { data: order, error: orderError } = await getServerSupabase()
    .from('orders')
    .insert({
      customer_id: data.customer_id,
      total_price: data.total_price,
      discount: data.discount || 10,
      status: 'pending',
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert order items
  const orderItems = data.items.map(item => ({
    order_id: order.id,
    ...item,
  }));

  const { error: itemsError } = await getServerSupabase()
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    // Rollback: delete the order
    await getServerSupabase().from('orders').delete().eq('id', order.id);
    throw itemsError;
  }

  return order;
}

export async function getOrders(status?: string) {
  let query = getServerSupabase()
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      items:order_items(*)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: number, status: string, trackingNumber?: string) {
  const updateData: any = { status };
  if (trackingNumber) {
    updateData.tracking_number = trackingNumber;
  }

  const { data, error } = await getServerSupabase()
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// Address Functions
// ============================================

export async function createAddress(data: {
  customer_id: number
  name: string
  phone: string
  address: string
  province?: string
  postal_code?: string
  is_default?: boolean
}) {
  const { data: address, error } = await getServerSupabase()
    .from('addresses')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return address;
}

export async function getCustomerAddresses(customerId: number) {
  const { data, error } = await getServerSupabase()
    .from('addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return data;
}
