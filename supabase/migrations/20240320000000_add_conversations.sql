-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add conversation_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Add RLS (Row Level Security) policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their conversations
CREATE POLICY "Users can view their own conversations"
    ON conversations
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- Policy to allow users to insert their own conversations
CREATE POLICY "Users can create their own conversations"
    ON conversations
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Policy to allow users to update their own conversations
CREATE POLICY "Users can update their own conversations"
    ON conversations
    FOR UPDATE
    USING (auth.uid()::text = user_id);

-- Policy to allow users to delete their own conversations
CREATE POLICY "Users can delete their own conversations"
    ON conversations
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- Add RLS to messages table if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see messages from their conversations
CREATE POLICY "Users can view messages from their conversations"
    ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()::text
        )
    );

-- Policy to allow users to insert messages to their conversations
CREATE POLICY "Users can insert messages to their conversations"
    ON messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
            AND conversations.user_id = auth.uid()::text
        )
    );

-- First, clean up any messages with null user_id
DELETE FROM messages WHERE user_id IS NULL;

-- Create a default conversation for existing users with valid user_ids
INSERT INTO conversations (user_id, title)
SELECT DISTINCT user_id, 'Default Chat'
FROM messages
WHERE conversation_id IS NULL
AND user_id IS NOT NULL;

-- Update existing messages to link to the default conversation
UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
AND m.user_id = c.user_id
AND m.user_id IS NOT NULL;

-- Make conversation_id NOT NULL after migration
ALTER TABLE messages
ALTER COLUMN conversation_id SET NOT NULL; 