import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, getAdminSession } from "@/lib/admin-auth";
import { roleHasPermission } from "@/lib/admin-permissions";
import { WebsiteAnalyticsDashboard } from "@/components/admin/website-analytics-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "สถิติและสถานะเว็บไซต์", robots: { index: false, follow: false } };

export default async function WebsiteAnalyticsPage() {
  const session = await getAdminSession(cookies().get(ADMIN_COOKIE_NAME)?.value);
  if (!session) redirect("/admin/login");
  if (!roleHasPermission(session.role, "analytics.view")) redirect("/admin?forbidden=1");
  return <WebsiteAnalyticsDashboard />;
}
