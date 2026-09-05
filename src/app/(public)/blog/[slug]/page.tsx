import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts, getBlogPostBySlug } from "@/data/blog";
import { APP_URL, getCanonical, safeJsonLd } from "@/lib/seo";
import type { ReactNode } from "react";

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
  if (params.slug === "why-choose-our-shop") {
    permanentRedirect("/blog/check-online-pod-shop-information");
  }

  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  // BlogPosting JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
    author: { "@type": "Organization", name: post.author || "กองบรรณาธิการ Pod4U" },
    publisher: { "@type": "Organization", name: "Pod4U", url: APP_URL },
    url: getCanonical(`/blog/${post.slug}`),
  };

  const faqJsonLd = post.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }
    : null;

  const renderInline = (text: string): ReactNode[] => {
    const parts = text.split(/(\*\*.+?\*\*|\[[^\]]+\]\([^\)]+\))/g);
    return parts.filter(Boolean).map((part, index) => {
      const bold = part.match(/^\*\*(.+)\*\*$/);
      if (bold) return <strong key={index} className="text-white">{bold[1]}</strong>;
      const link = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (link) return <Link key={index} href={link[2]} className="text-acid-lime hover:underline">{link[1]}</Link>;
      return part;
    });
  };

  // Lightweight markdown renderer for headings, lists, tables and internal links.
  const renderContent = (content: string) => {
    const lines = content.split("\n");
    const nodes: ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("## ")) {
        nodes.push(<h2 key={i} className="text-xl font-bold text-white mt-8 mb-3">{renderInline(line.slice(3))}</h2>);
        continue;
      }
      if (line.startsWith("### ")) {
        nodes.push(<h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{renderInline(line.slice(4))}</h3>);
        continue;
      }
      if (line.startsWith("| ")) {
        const rows: string[][] = [];
        while (i < lines.length && lines[i].startsWith("| ")) {
          const cells = lines[i].split("|").slice(1, -1).map((cell) => cell.trim());
          if (!cells.every((cell) => /^-+$/.test(cell))) rows.push(cells);
          i++;
        }
        i--;
        const [header, ...body] = rows;
        if (header) {
          nodes.push(
            <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5"><tr>{header.map((cell) => <th key={cell} className="px-4 py-3 text-white">{renderInline(cell)}</th>)}</tr></thead>
                <tbody>{body.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-white/10">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-white/70">{renderInline(cell)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        continue;
      }
      if (line.startsWith("- ")) {
        const items: string[] = [];
        while (i < lines.length && lines[i].startsWith("- ")) {
          items.push(lines[i].slice(2));
          i++;
        }
        i--;
        nodes.push(<ul key={`list-${i}`} className="my-4 list-disc space-y-2 pl-6 text-sm text-white/70">{items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>);
        continue;
      }
      if (line.trim()) nodes.push(<p key={i} className="text-white/70 text-sm leading-relaxed mb-3">{renderInline(line)}</p>);
    }

    return nodes;
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />}
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
              <span className="text-white/30 text-xs">ตรวจข้อมูลโดย {post.author || "กองบรรณาธิการ Pod4U"}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">{post.title}</h1>
            <p className="text-white/60 text-base">{post.excerpt}</p>
          </header>

          {/* Content */}
          <article className="prose-custom">
            {post.content ? renderContent(post.content) : <p className="text-white/50">ไม่มีเนื้อหา</p>}

            {post.faqs?.length ? (
              <section className="mt-10" aria-labelledby="article-faq">
                <h2 id="article-faq" className="text-2xl font-black text-white mb-4">คำถามที่พบบ่อย</h2>
                <div className="space-y-3">
                  {post.faqs.map((faq) => (
                    <details key={faq.question} className="navy-card rounded-xl border border-white/10 p-5">
                      <summary className="cursor-pointer font-bold text-white">{faq.question}</summary>
                      <p className="mt-3 text-sm leading-relaxed text-white/70">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {post.relatedLinks?.length ? (
              <aside className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6" aria-labelledby="related-content">
                <h2 id="related-content" className="text-xl font-black text-white mb-3">อ่านและดูข้อมูลต่อ</h2>
                <ul className="space-y-2">
                  {post.relatedLinks.map((link) => (
                    <li key={link.href}><Link href={link.href} className="text-acid-lime font-semibold hover:underline">{link.label}</Link></li>
                  ))}
                </ul>
              </aside>
            ) : null}
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
