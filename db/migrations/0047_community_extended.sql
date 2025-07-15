-- Community Extended Features Migration
-- Adds reactions, comments, and notifications for posts

-- Post reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL DEFAULT '❤️',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- General notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('announcement', 'post', 'comment', 'reaction', 'system', 'exam', 'homework')),
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Add media_urls column to posts if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_reactions
CREATE POLICY "Users can view reactions from their school"
    ON post_reactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM posts p
        JOIN users u ON p.school_id = u.school_id
        WHERE p.id = post_reactions.post_id
        AND u.id = auth.uid()
    ));

CREATE POLICY "Users can react to posts from their school"
    ON post_reactions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM posts p
        JOIN users u ON p.school_id = u.school_id
        WHERE p.id = post_reactions.post_id
        AND u.id = auth.uid()
    ));

CREATE POLICY "Users can delete their own reactions"
    ON post_reactions FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for post_comments
CREATE POLICY "Users can view comments from their school"
    ON post_comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM posts p
        JOIN users u ON p.school_id = u.school_id
        WHERE p.id = post_comments.post_id
        AND u.id = auth.uid()
    ));

CREATE POLICY "Users can comment on posts from their school"
    ON post_comments FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM posts p
        JOIN users u ON p.school_id = u.school_id
        WHERE p.id = post_comments.post_id
        AND u.id = auth.uid()
    ));

CREATE POLICY "Users can update their own comments"
    ON post_comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON post_comments FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Allow school staff to create notifications
CREATE POLICY "School staff can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND school_id = notifications.school_id
        AND role IN ('school_admin', 'teacher')
    ));

-- Function to notify users when a new post is created
CREATE OR REPLACE FUNCTION notify_users_of_new_post()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all users in the school based on audience
    INSERT INTO notifications (school_id, user_id, title, message, type, related_id)
    SELECT 
        NEW.school_id,
        u.id,
        'New Post: ' || NEW.title,
        'A new post has been shared in the community',
        'post',
        NEW.id
    FROM users u
    WHERE u.school_id = NEW.school_id
    AND u.id != NEW.author_id
    AND (
        NEW.audience = 'all' OR
        (NEW.audience = 'teachers' AND u.role = 'teacher') OR
        (NEW.audience = 'parents' AND u.role = 'parent') OR
        (NEW.audience = 'students' AND u.role = 'student')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify post author when someone comments
CREATE OR REPLACE FUNCTION notify_post_author_of_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if commenter is not the post author
    IF NEW.user_id != (SELECT author_id FROM posts WHERE id = NEW.post_id) THEN
        INSERT INTO notifications (school_id, user_id, title, message, type, related_id)
        SELECT 
            p.school_id,
            p.author_id,
            'New Comment on Your Post',
            u.first_name || ' ' || u.last_name || ' commented on your post: ' || p.title,
            'comment',
            NEW.id
        FROM posts p
        JOIN users u ON u.id = NEW.user_id
        WHERE p.id = NEW.post_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_users_of_new_post ON posts;
CREATE TRIGGER trigger_notify_users_of_new_post
    AFTER INSERT ON posts
    FOR EACH ROW
    EXECUTE FUNCTION notify_users_of_new_post();

DROP TRIGGER IF EXISTS trigger_notify_post_author_of_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_author_of_comment
    AFTER INSERT ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_post_author_of_comment();

-- Updated_at trigger for comments
CREATE TRIGGER post_comments_updated_at
    BEFORE UPDATE ON post_comments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at(); 