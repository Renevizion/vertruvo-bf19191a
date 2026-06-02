-- Add company column to leads table
ALTER TABLE public.leads 
ADD COLUMN company TEXT;