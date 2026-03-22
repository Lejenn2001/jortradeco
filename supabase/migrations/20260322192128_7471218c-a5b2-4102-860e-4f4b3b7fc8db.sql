CREATE POLICY "Allow reading all profiles for analytics"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);