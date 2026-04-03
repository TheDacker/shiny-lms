import { createClient } from "@/lib/supabase/server";
import PathForm from "@/components/admin/PathForm";

export default async function NewPathPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, cover_image_url, status")
    .order("title");

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          New Path
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Group courses into an ordered learning path
        </p>
      </div>

      <PathForm allCourses={courses ?? []} />
    </div>
  );
}
