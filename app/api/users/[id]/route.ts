import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH — update role and/or location (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role, location_id, is_active, first_name, last_name, phone, email } = body;

  const VALID_ROLES = ["admin", "manager", "learner"];
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Email update requires admin auth API
  if (email !== undefined) {
    const admin = createAdminClient();
    const { error: emailError } = await admin.auth.admin.updateUserById(id, { email });
    if (emailError) return NextResponse.json({ error: emailError.message }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (role !== undefined) patch.role = role;
  if (location_id !== undefined) patch.location_id = location_id;
  if (is_active !== undefined) patch.is_active = is_active;
  if (first_name !== undefined) patch.first_name = first_name;
  if (last_name !== undefined) patch.last_name = last_name;
  if (phone !== undefined) patch.phone = phone;
  if (email !== undefined) patch.email = email;

  const { error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// DELETE — remove user entirely (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deleting from auth.users cascades to public.users
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
