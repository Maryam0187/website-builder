import AdminTemplatePreview from "@/components/admin/AdminTemplatePreview";

export const dynamic = "force-dynamic";

export default async function CustomerTemplateHomePage({ params }) {
  const { id } = await params;
  return (
    <AdminTemplatePreview
      templateId={id}
      pageParam="home"
      roles={["owner", "admin"]}
      pathPrefix="/templates"
      backHref="/profile#templates"
      backLabel="← Templates"
    />
  );
}
