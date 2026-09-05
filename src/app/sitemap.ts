import { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo";
import { getServerSupabase } from "@/lib/supabase";
import { blogPosts } from "@/data/blog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getServerSupabase();

  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true);

  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  const { data: brands } = await supabase
    .from("brands")
    .select("slug")
    .eq("is_active", true);

  const baseEntries: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/stock`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${APP_URL}/brands`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  const productEntries: MetadataRoute.Sitemap = (products || [])
    .filter((p: any) => p.slug)
    .map((p: any) => ({
      url: `${APP_URL}/products/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const categoryEntries: MetadataRoute.Sitemap = (categories || []).map((c: any) => ({
    url: `${APP_URL}/categories/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const brandEntries: MetadataRoute.Sitemap = (brands || []).map((b: any) => ({
    url: `${APP_URL}/brands/${b.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...baseEntries, ...productEntries, ...categoryEntries, ...brandEntries, ...blogEntries];
}
