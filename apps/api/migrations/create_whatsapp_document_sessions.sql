-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS mattersapi;

-- Create enum type for session status
CREATE TYPE mattersapi.whatsapp_doc_session_status AS ENUM (
    'pending',
    'document_generated',
    'sent_to_whatsapp',
    'waiting_for_feedback',
    'editing',
    'completed',
    'cancelled'
);

-- Create WhatsApp document sessions table
CREATE TABLE mattersapi.whatsapp_document_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(320),
    document_type VARCHAR(50) NOT NULL,
    template_id VARCHAR(50),
    params JSONB DEFAULT '{}',
    current_content TEXT,
    previous_content TEXT,
    version INTEGER DEFAULT 1,
    status mattersapi.whatsapp_doc_session_status NOT NULL DEFAULT 'pending',
    last_message_id VARCHAR(100),
    last_message_timestamp TIMESTAMP WITH TIME ZONE,
    conversation_history JSONB DEFAULT '[]',
    pending_changes TEXT,
    final_document_url VARCHAR(500),
    document_generated_at TIMESTAMP WITH TIME ZONE,
    sent_to_whatsapp_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_whatsapp_doc_sessions_phone ON mattersapi.whatsapp_document_sessions(phone_number);
CREATE INDEX idx_whatsapp_doc_sessions_status ON mattersapi.whatsapp_document_sessions(status);
CREATE INDEX idx_whatsapp_doc_sessions_created_at ON mattersapi.whatsapp_document_sessions(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION mattersapi.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_doc_sessions_updated_at
    BEFORE UPDATE ON mattersapi.whatsapp_document_sessions
    FOR EACH ROW
    EXECUTE FUNCTION mattersapi.update_updated_at_column();
