-- Step 1: Drop all old foreign key constraints
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_workspace_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_workspace_id_fkey;
ALTER TABLE public.pipelines DROP CONSTRAINT IF EXISTS pipelines_workspace_id_fkey;
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_workspace_id_fkey;
ALTER TABLE public.knowledge_bases DROP CONSTRAINT IF EXISTS knowledge_bases_workspace_id_fkey;
ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_workspace_id_fkey;

-- Step 2: Update all records to point to the first workspace
UPDATE public.contacts 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

UPDATE public.tasks 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

UPDATE public.pipelines 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

UPDATE public.activities 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

UPDATE public.knowledge_bases 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

UPDATE public.ai_agents 
SET workspace_id = (SELECT id FROM public.workspaces ORDER BY created_at ASC LIMIT 1);

-- Step 3: Add new foreign keys to workspaces table
ALTER TABLE public.contacts
ADD CONSTRAINT contacts_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.pipelines
ADD CONSTRAINT pipelines_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.activities
ADD CONSTRAINT activities_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.knowledge_bases
ADD CONSTRAINT knowledge_bases_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.ai_agents
ADD CONSTRAINT ai_agents_workspace_id_fkey 
FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;