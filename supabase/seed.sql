-- Optional local seed. Run in Supabase SQL editor if you want a demo account.
-- Email: demo@ai-project.local
-- Password: DemoPass123!
-- Passwords are bcrypt-hashed via pgcrypto (same algorithm Supabase Auth uses).

do $$
declare
  demo_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  if not exists (select 1 from auth.users where id = demo_id) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      demo_id,
      'authenticated',
      'authenticated',
      'demo@ai-project.local',
      extensions.crypt('DemoPass123!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo User"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      demo_id,
      demo_id,
      jsonb_build_object('sub', demo_id::text, 'email', 'demo@ai-project.local'),
      'email',
      demo_id::text,
      now(),
      now(),
      now()
    );
  end if;
end $$;
