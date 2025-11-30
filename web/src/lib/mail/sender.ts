import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Sends an email via Mailgun (or logs it if API key is missing).
 * This function is designed to be called simultaneously with DB notifications.
 */
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const mailgunKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;

  // Mock sending if no API key (Development/Preview)
  if (!mailgunKey || !mailgunDomain) {
    console.log("📧 [Mock Email Sender] Would send email:", {
      to: payload.to,
      subject: payload.subject,
      contentPreview: payload.text.substring(0, 50) + "...",
    });
    return true;
  }

  try {
    const formData = new FormData();
    formData.append("from", `Togel <noreply@${mailgunDomain}>`);
    formData.append("to", payload.to);
    formData.append("subject", payload.subject);
    formData.append("text", payload.text);
    if (payload.html) formData.append("html", payload.html);

    const auth = Buffer.from(`api:${mailgunKey}`).toString("base64");

    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email via Mailgun:", error);
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
