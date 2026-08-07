import AdminTemplatePreview from "@/components/admin/AdminTemplatePreview";

export const dynamic = "force-dynamic";

export default async function AdminTemplatePagePreview({ params }) {
  const { id, page } = await params;
  return <AdminTemplatePreview templateId={id} pageParam={page} />;
}
