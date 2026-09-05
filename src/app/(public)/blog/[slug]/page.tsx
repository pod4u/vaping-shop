import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getBlogPostBySlug } from "@/data/blog";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return { title: "ไม่พบบทความ" };

  const title = `${post.title}`;
  const canonical = getCanonical(`/blog/${post.slug}`);

  return {
    title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: { title, description: post.excerpt, url: canonical, type: "article", siteName: "Pod4U", locale: "th_TH" },
    twitter: { card: "summary_large_image", title, description: post.excerpt },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  // BlogPosting JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Pod4U" },
    publisher: { "@type": "Organization", name: "Pod4U", url: APP_URL },
    url: getCanonical(`/blog/${post.slug}`),
  };

  // Simple markdown-like renderer
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>;
      if (line.startsWith("- **")) {
        const match = line.match(/- \*\*(.+?)\*\*\s*—?\s*(.*)/);
        if (match) return <li key={i} className="text-white/70 text-sm ml-4 mb-1"><strong className="text-white">{match[1]}</strong>{match[2] ? ` — ${match[2]}` : ""}</li>;
      }
      if (line.startsWith("- ")) return <li key={i} className="text-white/70 text-sm ml-4 mb-1">{line.slice(2)}</li>;
      if (line.startsWith("| ")) return null; // skip table rows (simplified)
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-white/70 text-sm leading-relaxed mb-2">{line}</p>;
    });
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="pt-28 pb-16 min-h-screen">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono text-white/50 mb-6">
            <Link href="/" className="hover:text-acid-lime transition-colors">หน้าแรก</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-acid-lime transition-colors">บทความ</Link>
            <span>/</span>
            <span className="text-acid-lime font-bold line-clamp-1">{post.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded bg-acid-lime/10 text-acid-lime text-[10px] font-mono uppercase">{post.category}</span>
              <span className="text-white/30 text-xs">{post.date}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">{post.title}</h1>
            <p className="text-white/60 text-base">{post.excerpt}</p>
          </header>

          {/* Content */}
          <article className="prose-custom">
            {post.content ? renderContent(post.content) : <p className="text-white/50">ไม่มีเนื้อหา</p>}
          </article>

          {/* Back */}
          <div className="mt-12 pt-6 border-t border-white/10">
            <Link href="/blog" className="text-acid-lime text-sm font-semibold hover:underline">
              ← กลับไปหน้าบทความ
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
