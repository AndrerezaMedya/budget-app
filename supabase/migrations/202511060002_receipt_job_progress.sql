-- Add progress tracking fields to receipt ingestion jobs
alter table public.receipt_ingestion_jobs
  add column if not exists progress_stage text not null default 'uploading',
  add column if not exists progress_message text,
  add column if not exists progress_value numeric(5,2) default 0,
  add column if not exists progress_detail jsonb;

update public.receipt_ingestion_jobs
set progress_stage = coalesce(progress_stage, 'uploading'),
    progress_value = coalesce(progress_value, 0);
