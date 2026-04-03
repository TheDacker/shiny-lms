import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CourseWizard from "@/components/admin/CourseWizard/index";
import type { WizardData, WizardAssignment, WizardQuestion, FlashcardItem } from "@/components/admin/CourseWizard/index";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: course },
    { data: locations },
    { data: courseLocations },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, description, cover_image_url, open_enrollment, status")
      .eq("id", id)
      .single(),
    supabase
      .from("locations")
      .select("id, name, state")
      .order("state")
      .order("name"),
    supabase
      .from("course_locations")
      .select("location_id")
      .eq("course_id", id),
    supabase
      .from("assignments")
      .select("id, title, media_type, media_url, embed_url, order, questions(id, type, prompt, options, correct_answer, order)")
      .eq("course_id", id)
      .order("order"),
  ]);

  if (!course) notFound();

  const wizardAssignments: WizardAssignment[] = (assignments ?? []).map((a) => {
    const sortedQuestions = [...((a.questions as any[]) ?? [])].sort(
      (x, y) => (x.order ?? 0) - (y.order ?? 0)
    );

    let textContent = "";
    let flashcards: FlashcardItem[] = [{ text: "", large: true }];
    let embedUrl = "";
    let mediaSource: "upload" | "embed" = "upload";

    if (a.media_type === "text") {
      textContent = (a.embed_url as string) ?? "";
    } else if (a.media_type === "flashcard") {
      try {
        flashcards = JSON.parse((a.embed_url as string) ?? "[]");
      } catch {
        flashcards = [{ text: "", large: true }];
      }
    } else if (a.embed_url) {
      embedUrl = a.embed_url as string;
      mediaSource = "embed";
    }

    return {
      localId: crypto.randomUUID(),
      title: a.title as string,
      mediaType: a.media_type as WizardAssignment["mediaType"],
      mediaSource,
      mediaFile: null,
      mediaPreviewUrl: (a.media_url as string) ?? "",
      embedUrl,
      textContent,
      flashcards,
      questions: sortedQuestions.map((q): WizardQuestion => ({
        localId: crypto.randomUUID(),
        type: q.type as WizardQuestion["type"],
        prompt: q.prompt as string,
        options: (q.options as string[]) ?? [],
        correctAnswer: q.correct_answer as string,
      })),
    };
  });

  const initialData: WizardData = {
    title: course.title as string,
    description: (course.description as string) ?? "",
    coverImageFile: null,
    coverImagePreviewUrl: (course.cover_image_url as string) ?? "",
    openEnrollment: course.open_enrollment as boolean,
    locationIds: (courseLocations ?? []).map((cl) => cl.location_id as string),
    assignments: wizardAssignments,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          Edit Course
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
          Update course settings and content
        </p>
      </div>

      <CourseWizard locations={locations ?? []} courseId={id} initialData={initialData} />
    </div>
  );
}
