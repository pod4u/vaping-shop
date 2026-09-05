import { redirect } from "next/navigation";

export default function BrandRedirect({ params }: { params: { slug: string } }) {
  redirect(`/brands/${params.slug}`);
}
