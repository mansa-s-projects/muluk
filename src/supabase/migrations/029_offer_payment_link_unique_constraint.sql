-- CIPHER — enforce offer payment link idempotency
-- Migration 029

BEGIN;

ALTER TABLE payment_links
  ADD CONSTRAINT payment_links_offer_creator_unique
  UNIQUE (offer_draft_id, creator_id);

COMMIT;
