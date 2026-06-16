-- CIPHER — atomic counter helpers for payment links

BEGIN;

CREATE OR REPLACE FUNCTION increment_payment_link_view_count(payment_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.payment_links
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = payment_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_payment_link_purchase_count(payment_link_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.payment_links
  SET purchase_count = COALESCE(purchase_count, 0) + 1
  WHERE id = payment_link_id;
END;
$$;

COMMIT;
