import AdminTemplatePreview from "@/components/admin/AdminTemplatePreview";

export const dynamic = "force-dynamic";

export default async function CustomerTemplatePagePreview({ params }) {
  const { id, page } = await params;
  return (
    <AdminTemplatePreview
      templateId={id}
      pageParam={page}
      roles={["owner", "admin"]}
      pathPrefix="/templates"
      backHref="/profile#templates"
      backLabel="← Templates"
    />
  );
}
