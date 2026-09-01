import HeroNavy from "@/components/HeroNavy";
import CategoriesNavy from "@/components/CategoriesNavy";
import ReadyToShipProductsNavy from "@/components/ReadyToShipProductsNavy";
import FeaturedProductsNavy from "@/components/FeaturedProductsNavy";
import BenefitsNavy from "@/components/BenefitsNavy";
import BlogSectionNavy from "@/components/BlogSectionNavy";

export default function NavyHomePage() {
  return (
    <>
      <HeroNavy />
      <CategoriesNavy />
      <ReadyToShipProductsNavy />
      <FeaturedProductsNavy />
      <BenefitsNavy />
      <BlogSectionNavy />
    </>
  );
}