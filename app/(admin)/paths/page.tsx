import Link from "next/link";
import { Plus, GitBranch, BookOpen, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeletePathButton from "./DeletePathButton";

export default async function PathsPage() {
  const supabase = await createClient();

  const { data: paths } = await supabase
    .from("paths")
    .select("id, title, description, cover_image_url, created_at")
    .order("created_at", { ascending: false });

  // Fetch course counts per path
  const { data: pathCourseCounts } = await supabase
    .from("path_courses")
    .select("path_id");

  const countMap = (pathCourseCounts ?? []).reduce<Record<string, number>>(
    (acc, row) => ({ ...acc, [row.path_id]: (acc[row.path_id] ?? 0) + 1 }),
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Paths
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(31,57,109,0.55)" }}>
            {paths?.length ?? 0} path{paths?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/paths/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
        >
          <Plus size={16} />
          New Path
        </Link>
      </div>

      {!paths || paths.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map((path) => (
            <PathCard
              key={path.id}
              path={path}
              courseCount={countMap[path.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Path card ────────────────────────────────────────────────

interface Path {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

function PathCard({ path, courseCount }: { path: Path; courseCount: number }) {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--color-white)" }}
    >
      {/* Cover */}
      <div
        className="h-36 flex items-center justify-center relative"
        style={{ backgroundColor: "rgba(31,57,109,0.06)" }}
      >
        {path.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={path.cover_image_url}
            alt={path.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <GitBranch size={32} style={{ color: "rgba(31,57,109,0.2)" }} />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <h3
          className="font-bold text-sm leading-snug line-clamp-2"
          style={{ color: "var(--color-primary)" }}
        >
          {path.title}
        </h3>

        {path.description && (
          <p className="text-xs line-clamp-2 flex-1" style={{ color: "rgba(31,57,109,0.55)" }}>
            {path.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span
            className="flex items-center gap-1 text-xs"
            style={{ color: "rgba(31,57,109,0.45)" }}
          >
            <BookOpen size={12} />
            {courseCount} course{courseCount !== 1 ? "s" : ""}
          </span>

          <div className="flex items-center gap-1">
            <Link
              href={`/paths/${path.id}/edit`}
              className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-[var(--color-primary)]"
              style={{ color: "rgba(31,57,109,0.35)" }}
              title="Edit"
            >
              <Pencil size={14} />
            </Link>
            <DeletePathButton pathId={path.id} pathTitle={path.title} />
          </div>
        </div>
      </div>
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
        <GitBranch size={24} style={{ color: "rgba(31,57,109,0.3)" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color: "var(--color-primary)" }}>
          No paths yet
        </p>
        <p className="text-sm mt-1" style={{ color: "rgba(31,57,109,0.5)" }}>
          Group courses into learning paths
        </p>
      </div>
      <Link
        href="/paths/new"
        className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide text-white mt-2"
        style={{ backgroundColor: "var(--color-accent)", fontFamily: "var(--font-heading)" }}
      >
        <Plus size={16} />
        New Path
      </Link>
    </div>
  );
}
