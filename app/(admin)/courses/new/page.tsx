import { createClient } from "@/lib/supabase/server";
import CourseWizard from "@/components/admin/CourseWizard/index";

export default async function NewCoursePage() {
  const supabase = await createClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, state")
    .order("state")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          New Course
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Build your course step by step
        </p>
      </div>

      <CourseWizard locations={locations ?? []} />
    </div>
  );
}
