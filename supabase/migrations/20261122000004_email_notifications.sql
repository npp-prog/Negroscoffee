-- Per-user switch for notification emails (new reviews for owners, new submissions for admins).
-- Replies to a person's own request (e.g. their claim decision) are always sent.
alter table public.profiles add column notify_email boolean not null default true;
