import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notificationId = params.id;
  const supabaseAdmin = createSupabaseAdminClient();

  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
