-- =============================================================================
-- Seed: Admin user + Organisation + Branches
-- Run with: supabase db execute --file supabase/seed/01_admin_user.sql
-- =============================================================================
-- Credentials created by this seed:
--   super_admin : cuonglhv@jaxtina.com       / Jaxtina@Admin1
--   teacher     : hoangngocquynh@jaxtina.com / Jaxtina@Teacher1
-- =============================================================================

-- ── Fixed UUIDs (stable across re-runs) ──────────────────────────────────────

do $$
declare
  v_admin_id    uuid := 'a0000000-0000-0000-0000-000000000001';
  v_teacher_id  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_org_id      uuid := 'b0000000-0000-0000-0000-000000000001';
  v_branch_hn   uuid := 'c0000000-0000-0000-0000-000000000001';
  v_branch_hcm  uuid := 'c0000000-0000-0000-0000-000000000002';
begin

  -- ── Auth users ─────────────────────────────────────────────────────────────

  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values
  (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'cuonglhv@jaxtina.com',
    crypt('Jaxtina@Admin1', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jaxtina Admin"}',
    false, '', '', '', ''
  ),
  (
    v_teacher_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'hoangngocquynh@jaxtina.com',
    crypt('Jaxtina@Teacher1', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Hoang Ngoc Quynh"}',
    false, '', '', '', ''
  )
  on conflict (id) do nothing;

  -- ── auth.identities (required for email login) ────────────────────────────

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values
  (
    v_admin_id, v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'cuonglhv@jaxtina.com'),
    'email', v_admin_id::text,
    now(), now(), now()
  ),
  (
    v_teacher_id, v_teacher_id,
    jsonb_build_object('sub', v_teacher_id::text, 'email', 'hoangngocquynh@jaxtina.com'),
    'email', v_teacher_id::text,
    now(), now(), now()
  )
  on conflict (provider, provider_id) do nothing;

  -- ── user_profiles ──────────────────────────────────────────────────────────
  -- The handle_new_user trigger fires on auth.users insert and creates a
  -- 'learner' profile. We upsert here to set the correct roles.

  insert into public.user_profiles (id, role, full_name, preferred_lang)
  values
    (v_admin_id,   'super_admin', 'Jaxtina Admin',    'vi'),
    (v_teacher_id, 'teacher',     'Hoang Ngoc Quynh', 'vi')
  on conflict (id) do update
    set role          = excluded.role,
        full_name     = excluded.full_name,
        preferred_lang = excluded.preferred_lang;

  -- ── Organisation ───────────────────────────────────────────────────────────

  insert into public.organisations (id, name, slug)
  values (v_org_id, 'Jaxtina English Centre', 'jaxtina')
  on conflict (id) do nothing;

  -- ── Branches ───────────────────────────────────────────────────────────────

  insert into public.branches (id, organisation_id, name, city, address)
  values
    (v_branch_hn,  v_org_id, 'Hanoi Branch',   'Hanoi',      '123 Cau Giay, Hanoi'),
    (v_branch_hcm, v_org_id, 'HCMC Branch',    'Ho Chi Minh City', '456 Nguyen Thi Minh Khai, HCMC')
  on conflict (id) do nothing;

  raise notice 'Seed 01 complete — admin + teacher + org + branches created.';
end
$$;
