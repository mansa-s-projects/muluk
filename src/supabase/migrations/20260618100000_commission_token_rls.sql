-- Enforce supporter commission token checks at the database policy layer.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_commission_access_token()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  headers jsonb;
  token text;
BEGIN
  headers := nullif(current_setting('request.headers', true), '')::jsonb;
  token := coalesce(
    headers ->> 'x-commission-token',
    headers ->> 'x-commission-access-token'
  );

  IF token IS NULL OR token !~ '^[0-9a-f]{48}$' THEN
    RETURN NULL;
  END IF;

  RETURN token;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_commission_access_token() TO anon, authenticated;

DROP POLICY IF EXISTS "client_view_commission" ON public.commissions;
CREATE POLICY "client_view_commission"
  ON public.commissions
  FOR SELECT
  USING (
    access_token = public.current_commission_access_token()
  );

DROP POLICY IF EXISTS "client_insert_commission_messages" ON public.commission_messages;
CREATE POLICY "client_insert_commission_messages"
  ON public.commission_messages
  FOR INSERT
  WITH CHECK (
    sender_role = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.commissions c
      WHERE c.id = commission_messages.commission_id
        AND c.access_token = public.current_commission_access_token()
    )
  );

DROP POLICY IF EXISTS "client_view_commission_messages" ON public.commission_messages;
CREATE POLICY "client_view_commission_messages"
  ON public.commission_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.commissions c
      WHERE c.id = commission_messages.commission_id
        AND c.access_token = public.current_commission_access_token()
    )
  );

COMMIT;
