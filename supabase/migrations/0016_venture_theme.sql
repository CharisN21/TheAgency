-- Venture themes: the two colours picked from a venture's logo, which its
-- workspaces take as their theme. Adds two columns; nothing is lost. A venture
-- without a logo keeps both empty and its workspaces keep The Agency's maroon.

alter table public.ventures
  add column theme_primary text check (theme_primary is null or theme_primary ~ '^#[0-9a-fA-F]{6}$'),
  add column theme_secondary text check (theme_secondary is null or theme_secondary ~ '^#[0-9a-fA-F]{6}$');
