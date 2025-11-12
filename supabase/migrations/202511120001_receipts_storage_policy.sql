-- Allow users to generate signed URLs for their own receipt images
create policy "Receipts bucket read access" on storage.objects
  for select
  using (
    bucket_id = 'receipts'
    and split_part(name, '/', 1) = auth.uid()::text
  );
