ALTER TABLE public.items ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 60;

-- Allow public (anon) read access to items, resources, bookings, business_settings, workspaces for public booking page
CREATE POLICY "Public can read items by workspace" ON public.items FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read resources by workspace" ON public.resources FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read bookings by workspace" ON public.bookings FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read business_settings" ON public.business_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Public can read workspaces by slug" ON public.workspaces FOR SELECT TO anon USING (true);

-- Allow anon to insert leads and bookings from public booking page
CREATE POLICY "Public can create leads from booking" ON public.leads FOR INSERT TO anon WITH CHECK (source = 'booking_page');
CREATE POLICY "Public can create bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);