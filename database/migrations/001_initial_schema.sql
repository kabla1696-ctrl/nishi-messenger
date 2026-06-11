-- Nishi Messenger Database Migration
-- Version: 1.0.0
-- Date: 2026-06-11

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    status TEXT DEFAULT 'Hey there! I am using Nishi 👻',
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE,
    ambient_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat members table
CREATE TABLE IF NOT EXISTS chat_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'video', 'file')),
    universe VARCHAR(20) DEFAULT 'real' CHECK (universe IN ('real', 'decoy')),
    is_screenshot_trapped BOOLEAN DEFAULT false,
    is_ghost_drop BOOLEAN DEFAULT false,
    is_vanish_mode BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Ghost Drops table
CREATE TABLE IF NOT EXISTS ghost_drops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER DEFAULT 50 CHECK (radius_meters > 0 AND radius_meters <= 1000),
    is_claimed BOOLEAN DEFAULT false,
    claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Parallel Universes table
CREATE TABLE IF NOT EXISTS parallel_universes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE UNIQUE,
    real_messages_count INTEGER DEFAULT 0,
    decoy_messages_count INTEGER DEFAULT 0,
    auto_switch_enabled BOOLEAN DEFAULT true,
    switch_triggers JSONB DEFAULT '{"proximity": true, "camera": false, "keyword": false, "shake": true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Proximity Settings table
CREATE TABLE IF NOT EXISTS proximity_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    radius_feet INTEGER DEFAULT 3 CHECK (radius_feet > 0 AND radius_feet <= 10),
    auto_hide BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_id)
);

-- Ambient States table
CREATE TABLE IF NOT EXISTS ambient_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    activity VARCHAR(50) DEFAULT 'stationary',
    environment VARCHAR(50) DEFAULT 'day',
    battery_level INTEGER,
    is_moving BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Screenshot Trap Incidents table
CREATE TABLE IF NOT EXISTS screenshot_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    screenshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_universe ON messages(universe);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);

CREATE INDEX IF NOT EXISTS idx_ghost_drops_creator_id ON ghost_drops(creator_id);
CREATE INDEX IF NOT EXISTS idx_ghost_drops_chat_id ON ghost_drops(chat_id);
CREATE INDEX IF NOT EXISTS idx_ghost_drops_location ON ghost_drops(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_ghost_drops_is_claimed ON ghost_drops(is_claimed);
CREATE INDEX IF NOT EXISTS idx_ghost_drops_expires_at ON ghost_drops(expires_at);

CREATE INDEX IF NOT EXISTS idx_ambient_states_user_id ON ambient_states(user_id);

-- Functions

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers

-- Update users.updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update ambient_states.updated_at
CREATE TRIGGER update_ambient_states_updated_at
    BEFORE UPDATE ON ambient_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views

-- Active ghost drops view
CREATE OR REPLACE VIEW active_ghost_drops AS
SELECT 
    gd.*,
    m.content,
    u.display_name as creator_name,
    (
        6371 * acos(
            cos(radians(gd.latitude)) * cos(radians(gd.latitude)) *
            cos(radians(gd.longitude) - radians(gd.longitude)) +
            sin(radians(gd.latitude)) * sin(radians(gd.latitude))
        )
    ) AS distance_km
FROM ghost_drops gd
JOIN messages m ON gd.message_id = m.id
JOIN users u ON gd.creator_id = u.id
WHERE gd.is_claimed = false 
    AND gd.expires_at > NOW();

-- User chat summary view
CREATE OR REPLACE VIEW user_chat_summary AS
SELECT 
    u.id as user_id,
    u.display_name,
    COUNT(DISTINCT cm.chat_id) as total_chats,
    COUNT(DISTINCT m.id) as total_messages,
    MAX(m.created_at) as last_message_at
FROM users u
LEFT JOIN chat_members cm ON u.id = cm.user_id
LEFT JOIN messages m ON cm.chat_id = m.chat_id
GROUP BY u.id, u.display_name;

-- Comments
COMMENT ON TABLE users IS 'User accounts for Nishi Messenger';
COMMENT ON TABLE chats IS 'Chat conversations';
COMMENT ON TABLE chat_members IS 'Members of each chat';
COMMENT ON TABLE messages IS 'Messages in chats with universe support';
COMMENT ON TABLE ghost_drops IS 'Location-based hidden messages';
COMMENT ON TABLE parallel_universes IS 'Parallel universe settings for chats';
COMMENT ON TABLE proximity_settings IS 'Proximity detection settings per user/chat';
COMMENT ON TABLE ambient_states IS 'Current ambient state of users';
COMMENT ON TABLE screenshot_incidents IS 'Screenshot detection incidents';
