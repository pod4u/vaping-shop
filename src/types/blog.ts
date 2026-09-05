export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  slug: string;
  content?: string;
  updatedAt?: string;
  author?: string;
  relatedLinks?: Array<{ href: string; label: string }>;
  faqs?: Array<{ question: string; answer: string }>;
}
