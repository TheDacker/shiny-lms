import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CoursesClient from "./CoursesClient";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, cover_image_url, status, open_enrollment, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Courses
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
            {courses?.length ?? 0} course{courses?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
        >
          <Plus size={16} />
          New Course
        </Link>
      </div>

      {/* Grid */}
      {!courses || courses.length === 0 ? (
        <EmptyState />
      ) : (
        <CoursesClient courses={courses} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center py-20 gap-4"
      style={{ backgroundColor: "var(--color-white)" }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(31,57,109,0.07)" }}
      >
        <BookOpen size={24} style={{ color: "rgba(31,57,109,0.3)" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color: "var(--color-primary)" }}>
          No courses yet
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.5)" }}>
          Create your first course to get started
        </p>
      </div>
      <Link
        href="/courses/new"
        className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white mt-2"
        style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
      >
        <Plus size={16} />
        New Course
      </Link>
    </div>
  );
}
