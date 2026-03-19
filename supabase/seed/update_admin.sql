-- =============================================================================
-- Update admin account to match current seed values
-- Source: supabase/seed/01_admin_user.sql
--
-- Admin details:
--   id        : a0000000-0000-0000-0000-000000000001
--   email     : cuonglhv@jaxtina.com
--   full_name : Jaxtina Admin
--   role      : super_admin
--   org_id    : b0000000-0000-0000-0000-000000000001
--   branch_id : c0000000-0000-0000-0000-000000000001  (Hanoi)
-- =============================================================================

BEGIN;

-- 1. Update public.user_profiles
--    (email is not a column here — it lives in auth.users)
UPDATE public.user_profiles
SET
  full_name  = 'Jaxtina Admin',
  role       = 'super_admin',
  updated_at = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 2. Update auth.users to keep email in sync
UPDATE auth.users
SET
  email      = 'cuonglhv@jaxtina.com',
  updated_at = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- 3. Update auth.identities to keep identity_data in sync
UPDATE auth.identities
SET
  identity_data = jsonb_build_object(
    'sub',   'a0000000-0000-0000-0000-000000000001',
    'email', 'cuonglhv@jaxtina.com'
  ),
  updated_at = NOW()
WHERE user_id = 'a0000000-0000-0000-0000-000000000001';

COMMIT;
