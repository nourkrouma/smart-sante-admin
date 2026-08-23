import { AuthGate } from "@/components/auth/auth-gate";
import { Sidebar } from "@/components/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="flex min-h-svh flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </AuthGate>
  );
}
