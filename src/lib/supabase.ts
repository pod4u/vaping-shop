import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Client for browser (public access with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
};

// Server client with service role (admin access)
export const getServerSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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