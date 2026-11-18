import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnerSupportDetail } from "@/lib/admin-users";
import AdminUserSupport from "@/components/admin/AdminUserSupport";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({ params }) {
  const admin = await requireUser(["admin"]);
  if (!admin) redirect("/login?next=/admin");

  const { id } = await params;
  let detail;
  try {
    detail = await getOwnerSupportDetail(id);
  } catch {
    redirect("/admin");
  }

  return <AdminUserSupport initialDetail={JSON.parse(JSON.stringify(detail))} />;
}
