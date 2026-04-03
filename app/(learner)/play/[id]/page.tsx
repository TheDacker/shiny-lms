import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkCourseAccess } from "@/lib/courseAccess";
import AssignmentPlayer from "./AssignmentPlayer";
import type { Assignment, Question } from "./AssignmentPlayer";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch assignment
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, media_type, media_url, embed_url, course_id")
    .eq("id", id)
    .single();

  if (!assignment) notFound();

  // Verify access: open enrollment, direct enrollment, or via a path
  const hasAccess = await checkCourseAccess(supabase, user.id, assignment.course_id);
  if (!hasAccess) redirect("/library");

  // Fetch questions ordered
  const { data: questions } = await supabase
    .from("questions")
    .select("id, type, prompt, options, correct_answer, order")
    .eq("assignment_id", id)
    .order("order");

  // Check existing progress
  const { data: progress } = await supabase
    .from("progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("assignment_id", id)
    .maybeSingle();

  return (
    <AssignmentPlayer
      assignment={assignment as unknown as Assignment}
      questions={(questions ?? []) as unknown as Question[]}
      alreadyCompleted={progress?.completed ?? false}
      userId={user.id}
    />
  );
}
