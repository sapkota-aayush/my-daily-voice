-- Assign existing data to a specific user by email
-- Run this AFTER the main migration (20251220000000_add_user_auth.sql)
-- Replace 'aayushsapkota1030@gmail.com' with your actual email if different

DO $$
DECLARE
  target_user_id UUID;
  target_email TEXT := 'aayushsapkota1030@gmail.com';
BEGIN
  -- Get the user_id for the email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  -- If user doesn't exist yet, they need to sign up first
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Please sign up first, then run this migration.', target_email;
  END IF;

  -- Update daily_reflections that don't have a user_id
  UPDATE public.daily_reflections
  SET user_id = target_user_id
  WHERE user_id IS NULL;

  -- Update onboarding_transcripts that don't have a user_id
  UPDATE public.onboarding_transcripts
  SET user_id = target_user_id
  WHERE user_id IS NULL;

  -- Update tasks that don't have a user_id
  UPDATE public.tasks
  SET user_id = target_user_id
  WHERE user_id IS NULL;

  RAISE NOTICE 'Successfully assigned all existing data to user: %', target_email;
END $$;
