-- Step 4.3: Add message_likes table for tracking individual likes

BEGIN;

-- Message likes table for tracking who liked which message
CREATE TABLE IF NOT EXISTS message_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id), -- Each user can like a message only once
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for message likes queries
CREATE INDEX idx_message_likes_message_id ON message_likes(message_id);
CREATE INDEX idx_message_likes_user_id ON message_likes(user_id);
CREATE INDEX idx_message_likes_created_at ON message_likes(created_at);

-- Create function to update like_count when message_likes changes
CREATE OR REPLACE FUNCTION update_message_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE messages
    SET like_count = like_count + 1
    WHERE id = NEW.message_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE messages
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.message_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update like_count
CREATE TRIGGER trigger_message_like_count_insert
AFTER INSERT ON message_likes
FOR EACH ROW
EXECUTE FUNCTION update_message_like_count();

CREATE TRIGGER trigger_message_like_count_delete
AFTER DELETE ON message_likes
FOR EACH ROW
EXECUTE FUNCTION update_message_like_count();

COMMIT;
