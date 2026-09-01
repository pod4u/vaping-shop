import HeroHybrid from "@/components/HeroHybrid";
import CategoriesHybrid from "@/components/CategoriesHybrid";
import ReadyToShipProductsHybrid from "@/components/ReadyToShipProductsHybrid";
import FeaturedProductsHybrid from "@/components/FeaturedProductsHybrid";
import BenefitsHybrid from "@/components/BenefitsHybrid";
import BlogSectionHybrid from "@/components/BlogSectionHybrid";

export default function HybridHomePage() {
  return (
    <>
      <HeroHybrid />
      <CategoriesHybrid />
      <ReadyToShipProductsHybrid />
      <FeaturedProductsHybrid />
      <BenefitsHybrid />
      <BlogSectionHybrid />
    </>
  );
}