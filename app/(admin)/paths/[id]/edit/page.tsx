import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PathForm from "@/components/admin/PathForm";

export default async function EditPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: path }, { data: pathCourses }, { data: allCourses }] =
    await Promise.all([
      supabase
        .from("paths")
        .select("id, title, description, cover_image_url")
        .eq("id", id)
        .single(),
      supabase
        .from("path_courses")
        .select("course_id, order, courses(id, title, cover_image_url, status)")
        .eq("path_id", id)
        .order("order"),
      supabase
        .from("courses")
        .select("id, title, cover_image_url, status")
        .order("title"),
    ]);

  if (!path) notFound();

  type CourseRow = { id: string; title: string; cover_image_url: string | null; status: string };
  const orderedCourses = (pathCourses ?? [])
    .map((row) => row.courses as unknown as CourseRow)
    .filter((c): c is CourseRow => !!c);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Edit Path
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          {path.title}
        </p>
      </div>

      <PathForm
        pathId={path.id}
        initialData={{
          title: path.title,
          description: path.description ?? "",
          coverImagePreviewUrl: path.cover_image_url ?? "",
          courses: orderedCourses,
        }}
        allCourses={allCourses ?? []}
      />
    </div>
  );
}
