import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { broadcastNotification } from "@/lib/mail/sender";
// import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function POST(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, targetType, targetEmail } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Resolve Email to User ID if individual
  if (targetType === "individual" && targetEmail) {
    // const supabaseAdmin = createSupabaseAdminClient();
    // Try to find user by email in public.profiles (assuming email sync) or we rely on targetEmail sending
    // Since we can't search auth.users by email easily via public API without specific setup,
    // we will prioritize the email sending. For DB notification, we need a user_id.
    // Strategy: Use admin.getUserByEmail if available, or search profiles if email is stored there.
    // Current profiles table doesn't strictly have email.
    
    // Important: We'll try to send email regardless. For DB notification, we might fail if we can't map to ID.
    // For this MVP, we will proceed with sending email.
  }

  const result = await broadcastNotification({
    title,
    content,
    targetEmail: targetType === "individual" ? targetEmail : undefined,
    // targetUserId is difficult to resolve from email without extra permissions/columns.
    // If individual and we can't find ID, we just send email.
    // If global (targetType !== individual), targetUserId is undefined (null in DB).
  });

  return NextResponse.json(result);
}
