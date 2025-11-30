-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL means global notification
    type TEXT NOT NULL CHECK (type IN ('admin', 'matching', 'system')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- For storing sender_id, rank, url, etc.
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notification_reads table for tracking read status
CREATE TABLE IF NOT EXISTS public.notification_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON public.notifications (user_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads (user_id);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can view their own or global notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Notification Reads: Users can manage their own read status
CREATE POLICY "Users can manage own read status" ON public.notification_reads
    FOR ALL USING (auth.uid() = user_id);

-- Grant access to service role (for admin actions)
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.notification_reads TO service_role;
