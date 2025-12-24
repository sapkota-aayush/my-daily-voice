-- Check onboarding_transcripts data
-- Run this in Supabase Dashboard → SQL Editor

-- Count total records
SELECT COUNT(*) as total_records FROM public.onboarding_transcripts;

-- See all records (with user info)
SELECT 
  ot.id,
  ot.user_id,
  u.email,
  ot.completed_at,
  ot.extracted_at,
  ot.created_at,
  jsonb_array_length(ot.transcript) as message_count
FROM public.onboarding_transcripts ot
LEFT JOIN auth.users u ON ot.user_id = u.id
ORDER BY ot.created_at DESC;

-- See transcript preview (first few messages)
SELECT 
  id,
  user_id,
  completed_at,
  jsonb_array_length(transcript) as total_messages,
  transcript->0 as first_message,
  transcript->1 as second_message
FROM public.onboarding_transcripts
ORDER BY created_at DESC
LIMIT 5;

-- See FULL conversation transcript (all messages)
SELECT 
  id,
  user_id,
  completed_at,
  jsonb_array_length(transcript) as total_messages,
  transcript as full_transcript
FROM public.onboarding_transcripts
WHERE id = '3f38aaa4-d9a7-4756-8ba9-9fb1e1b83782';

-- See conversation in a readable format (one row per message)
SELECT 
  ot.id as transcript_id,
  ot.completed_at,
  msg.ordinality - 1 as message_number,
  msg.value->>'role' as role,
  msg.value->>'content' as content,
  msg.value->>'timestamp' as timestamp
FROM public.onboarding_transcripts ot,
  jsonb_array_elements(ot.transcript) WITH ORDINALITY msg
WHERE ot.id = '3f38aaa4-d9a7-4756-8ba9-9fb1e1b83782'
ORDER BY msg.ordinality;
