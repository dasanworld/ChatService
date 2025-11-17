-- Step 4.2: Add typing indicator and user presence tables for real-time features

BEGIN;

-- Typing indicator table for "user is typing" status
CREATE TABLE IF NOT EXISTS typing_indicator (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for typing indicator queries
CREATE INDEX idx_typing_indicator_room_id ON typing_indicator(room_id);
CREATE INDEX idx_typing_indicator_expires_at ON typing_indicator(expires_at);
CREATE INDEX idx_typing_indicator_room_user ON typing_indicator(room_id, user_id);

-- User presence table for online status tracking
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for user presence queries
CREATE INDEX idx_user_presence_room_id ON user_presence(room_id);
CREATE INDEX idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX idx_user_presence_room_online ON user_presence(room_id, is_online);

-- Create trigger to update updated_at for user_presence
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_presence_updated_at
BEFORE UPDATE ON user_presence
FOR EACH ROW
EXECUTE FUNCTION update_user_presence_timestamp();

COMMIT;
