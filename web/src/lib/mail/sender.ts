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

const PAGE_SIZE = 200;

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

const fetchAllUserEmails = async (): Promise<string[]> => {
  const supabase = createSupabaseAdminClient();
  const emails: string[] = [];
  let page = 1;
  let shouldContinue = true;

  while (shouldContinue) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });

    if (error) {
      console.error("Failed to list users for email broadcast:", error);
      break;
    }

    const pageUsers = data?.users ?? [];
    pageUsers.forEach((user) => {
      if (user.email) {
        emails.push(user.email);
      }
    });

    if (!pageUsers.length || pageUsers.length < PAGE_SIZE) {
      shouldContinue = false;
    } else {
      page += 1;
    }
  }

  return emails;
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
  
  const sentEmails: string[] = [];
  const failedEmails: { to: string; reason: unknown }[] = [];

  const sendWithTracking = async (to: string) => {
    const success = await sendEmail({
      to,
      subject: params.title,
      text: params.content,
    });
    if (success) {
      sentEmails.push(to);
    } else {
      failedEmails.push({ to, reason: "sendEmail returned false" });
    }
  };

  if (params.targetEmail) {
    await sendWithTracking(params.targetEmail);
  } else if (params.targetUserId) {
    const { data, error: userError } = await supabase.auth.admin.getUserById(params.targetUserId);
    if (userError) {
      console.error("Failed to fetch user for notification email:", userError);
    } else if (data?.user?.email) {
      await sendWithTracking(data.user.email);
    } else {
      console.warn("Could not find email for user:", params.targetUserId);
    }
  } else {
    const allEmails = await fetchAllUserEmails();
    for (const email of allEmails) {
      // Avoid overwhelming Resend in tiny burst; sequential send is safer for now.
      await sendWithTracking(email);
    }
  }

  return {
    success: true,
    notification,
    emailDelivery: {
      sent: sentEmails.length,
      failed: failedEmails,
    },
  };
};
