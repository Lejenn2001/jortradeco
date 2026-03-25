CREATE POLICY "Admins can delete any message"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));