import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/db";
import Dashboard from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Dashboard initial={await getWorkspace(user)} />;
}
