import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Admin check helper
const checkAdmin = async () => {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabase.auth.getSession();
  
  const allowedEmails = ["goldbenchan@gmail.com", "kusanokiyoshi1@gmail.com"];
  if (!session?.user?.email || !allowedEmails.includes(session.user.email)) {
    return false;
  }
  return true;
};

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  
  // Fetch admin notifications (history)
  // We also want to know WHO it was sent to if it's individual.
  // For individual, user_id is set. We might want to join with profiles to get names.
  
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*, profiles(full_name, email)") // Note: profiles might not have email depending on schema, let's check schema if needed. usually only id/name.
    .eq("type", "admin")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // If profiles join fails (no FK), retry without join
    const { data: retryData, error: retryError } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("type", "admin")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });
    return NextResponse.json(retryData);
  }

  return NextResponse.json(data);
}
