-- Observers, step 1: the role. Postgres will not let a migration use a value
-- it adds to a list of choices in the same step, so the rules that use it are
-- in 0016. Nothing is lost.

alter type public.member_role add value if not exists 'observer' before 'viewer';
