import HeroVideoNavy from "@/components/HeroVideoNavy";
import CategoriesNavy from "@/components/CategoriesNavy";
import ReadyToShipProductsNavy from "@/components/ReadyToShipProductsNavy";
import FeaturedProductsNavy from "@/components/FeaturedProductsNavy";
import BenefitsNavy from "@/components/BenefitsNavy";
import BlogSectionNavy from "@/components/BlogSectionNavy";

export default function NavyHomePage() {
  return (
    <>
      <HeroVideoNavy />
      <CategoriesNavy />
      <ReadyToShipProductsNavy />
      <FeaturedProductsNavy />
      <BenefitsNavy />
      <BlogSectionNavy />
    </>
  );
}