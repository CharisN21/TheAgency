-- Phase 5: banner controls, per person and workspace. Adds columns to
-- notification_prefs; nothing is lost and existing rows keep working.
--   banners_off  switch off banners from one workspace (the bell still works)
--   quiet_from / quiet_to  a daily window with no banners; notifications wait in the bell
--   tz           the person's time zone, so the window follows their own clock

alter table public.notification_prefs
  add column banners_off boolean not null default false,
  add column quiet_from time,
  add column quiet_to time,
  add column tz text check (tz is null or char_length(tz) <= 64);
