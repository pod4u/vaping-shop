import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1 ml-[280px] bg-brand-void min-h-screen">
        {children}
      </main>
    </div>
  );
}