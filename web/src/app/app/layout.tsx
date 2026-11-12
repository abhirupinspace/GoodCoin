import { AppBottomNav, AppSidebar } from "@/components/app/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AppSidebar />
      <div>{children}</div>
      <AppBottomNav />
    </div>
  );
}
