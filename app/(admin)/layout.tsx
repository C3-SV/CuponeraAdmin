import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdminProfile } from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await requireAdminProfile();

  return (
    <DashboardShell activeRole={profile.user_role} user={{
        firstName: profile.first_names,
        lastName: profile.last_names,
      }}>
      {children}
    </DashboardShell>
  );
}