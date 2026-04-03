// Shared domain types used across learner pages.
// Supabase relational selects don't infer joined row types automatically,
// so we define them here and cast at the call site with `as unknown as`.

export type CourseRow = {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
};

export type PathRow = {
  id: string;
  title: string;
  cover_image_url: string | null;
  description: string | null;
};
