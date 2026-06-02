-- Add soft delete columns to workflows table
ALTER TABLE workflows 
ADD COLUMN is_deleted BOOLEAN DEFAULT false,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_workflows_is_deleted ON workflows(is_deleted);
CREATE INDEX idx_workflows_deleted_at ON workflows(deleted_at) WHERE deleted_at IS NOT NULL;