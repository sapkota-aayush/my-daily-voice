-- View full onboarding conversation in readable format
-- Replace the ID below with your transcript ID if different

SELECT 
  ot.id as transcript_id,
  ot.completed_at,
  msg.ordinality as message_number,
  msg.value->>'role' as role,
  msg.value->>'content' as content,
  msg.value->>'timestamp' as timestamp
FROM public.onboarding_transcripts ot,
  jsonb_array_elements(ot.transcript) WITH ORDINALITY msg
WHERE ot.id = '3f38aaa4-d9a7-4756-8ba9-9fb1e1b83782'
ORDER BY msg.ordinality;

-- Alternative: Get full transcript as JSON (easier to copy)
SELECT 
  id,
  completed_at,
  transcript
FROM public.onboarding_transcripts
WHERE id = '3f38aaa4-d9a7-4756-8ba9-9fb1e1b83782';
