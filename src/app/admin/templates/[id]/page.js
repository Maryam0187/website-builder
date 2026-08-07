import AdminTemplatePreview from "@/components/admin/AdminTemplatePreview";

export const dynamic = "force-dynamic";

export default async function AdminTemplateHomePage({ params }) {
  const { id } = await params;
  return <AdminTemplatePreview templateId={id} pageParam="home" />;
}
