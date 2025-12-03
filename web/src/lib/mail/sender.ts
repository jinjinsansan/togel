import { Resend } from "resend";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "Togel <noreply@to-gel.com>";
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends an email via Resend (or logs it if API key is missing).
 */
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  if (!resendClient) {
    console.log("📧 [Mock Email Sender] Would send email:", {
      to: payload.to,
      subject: payload.subject,
      contentPreview: payload.text.substring(0, 80) + (payload.text.length > 80 ? "..." : ""),
    });
    return true;
  }

  try {
    const { error } = await resendClient.emails.send({
      from: resendFrom,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    if (error) {
      console.error("Failed to send email via Resend:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
};

/**
 * Broadcasts an admin notification to users.
 * Creates DB records AND sends emails simultaneously.
 */
export const broadcastNotification = async (
  params: {
    title: string;
    content: string;
    targetUserId?: string; // If null, it's a global broadcast (Warning: Emailing ALL users in global is heavy)
    targetEmail?: string;  // For direct email targeting without user ID lookup
  }
) => {
  const supabase = createSupabaseAdminClient();

  // 1. Create DB Notification
  const { data: notification, error } = await supabase
    .from("notifications")
    .insert({
      title: params.title,
      content: params.content,
      type: "admin",
      user_id: params.targetUserId || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create DB notification:", error);
    return { success: false, error };
  }

  // 2. Send Email Simultaneously
  // Note: For global broadcast (targetUserId is null), we typically wouldn't email everyone in a loop here 
  // due to timeout risks. Real-world would use a queue. 
  // For this implementation, we handle single target or specific email.
  
  let emailSuccess = false;

  if (params.targetEmail) {
    // Direct email
    emailSuccess = await sendEmail({
      to: params.targetEmail,
      subject: params.title,
      text: params.content,
    });
  } else if (params.targetUserId) {
    // Fetch email from user ID (auth table or public users table if email stored there)
    // Since we can't easily access auth.users emails from here without admin privilege on auth schema,
    // we assume we might have it or need to fetch it.
    // For now, we'll log that we need the email.
    // ideally: const { data: user } = await supabase.auth.admin.getUserById(params.targetUserId);
    // But supabase-js admin client has auth.admin methods.
    
    const { data: { user } } = await supabase.auth.admin.getUserById(params.targetUserId);
    
    if (user?.email) {
      emailSuccess = await sendEmail({
        to: user.email,
        subject: params.title,
        text: params.content,
      });
    } else {
      console.warn("Could not find email for user:", params.targetUserId);
    }
  } else {
    console.warn("Skipping email for global broadcast to prevent timeout (Needs Batch Job)");
    // In a real scenario, we would trigger a background function here.
  }

  return { success: true, notification, emailSent: emailSuccess };
};
