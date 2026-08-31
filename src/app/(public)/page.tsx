import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import ReadyToShipProducts from "@/components/ReadyToShipProducts";
import FeaturedProducts from "@/components/FeaturedProducts";
import Benefits from "@/components/Benefits";
import BlogSection from "@/components/BlogSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <ReadyToShipProducts />
      <FeaturedProducts />
      <Benefits />
      <BlogSection />
    </>
  );
}