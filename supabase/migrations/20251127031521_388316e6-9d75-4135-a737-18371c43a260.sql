-- Fix storage RLS policies for assets bucket
-- Drop existing policies that may be blocking
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Authenticated users can upload assets" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own assets" ON storage.objects;
  DROP POLICY IF EXISTS "Public read access to assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated uploads to assets" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public reads from assets" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies for assets bucket
-- Allow authenticated users to upload to assets bucket
CREATE POLICY "Authenticated users can upload to assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Allow authenticated users to update their uploads in assets
CREATE POLICY "Users can update assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'assets');

-- Allow public read access to assets bucket (since it's public)
CREATE POLICY "Public can view assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'assets');