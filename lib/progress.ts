// Shared progress calculation utilities used across learner pages.

type AssignmentRef = { id: string; course_id: string };
type ProgressRef = { assignment_id: string; completed: boolean };
export type CourseProgress = Record<string, { total: number; done: number }>;

/**
 * Build a map of courseId → { total, done } from raw assignment + progress rows.
 */
export function buildCourseProgress(
  assignments: AssignmentRef[],
  progressRows: ProgressRef[]
): CourseProgress {
  const completedSet = new Set(
    progressRows.filter((p) => p.completed).map((p) => p.assignment_id)
  );
  const map: CourseProgress = {};
  for (const a of assignments) {
    if (!map[a.course_id]) map[a.course_id] = { total: 0, done: 0 };
    map[a.course_id].total++;
    if (completedSet.has(a.id)) map[a.course_id].done++;
  }
  return map;
}

/**
 * Returns true only if the course has at least one assignment and all are completed.
 */
export function isCourseComplete(progress: CourseProgress, courseId: string): boolean {
  const prog = progress[courseId];
  return !!(prog && prog.total > 0 && prog.done === prog.total);
}
