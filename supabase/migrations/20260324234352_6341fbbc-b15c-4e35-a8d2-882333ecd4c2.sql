ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

-- Function to generate a URL-friendly slug from business name
CREATE OR REPLACE FUNCTION public.generate_workspace_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Only generate if slug is null
  IF NEW.slug IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create base slug from workspace name
  base_slug := lower(regexp_replace(regexp_replace(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  -- If empty, use a random string
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'workspace';
  END IF;
  
  -- Ensure uniqueness
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate slug on insert/update
CREATE TRIGGER trg_generate_workspace_slug
  BEFORE INSERT OR UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_workspace_slug();

-- Backfill existing workspaces with slugs
UPDATE public.workspaces SET slug = slug WHERE slug IS NULL;