-- Step 4.6: Add message read receipts table

BEGIN;

-- Message read receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for read receipt queries
CREATE INDEX idx_message_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX idx_message_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX idx_message_read_receipts_read_at ON message_read_receipts(read_at);

COMMIT;
