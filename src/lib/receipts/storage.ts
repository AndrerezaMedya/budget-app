import { randomUUID } from "node:crypto";

import { createSupabaseServiceClient } from "@/lib/supabase/admin";

export type StoreReceiptParams = {
  userId: string;
  buffer: Buffer;
  contentType: string;
  extension: string;
};

export async function storeReceiptImage({ userId, buffer, contentType, extension }: StoreReceiptParams) {
  const supabase = createSupabaseServiceClient();
  const filename = `${randomUUID()}.${extension.replace(/^\./, "")}`;
  const objectPath = `${userId}/${filename}`;

  const { error } = await supabase.storage.from("receipts").upload(objectPath, buffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload receipt image: ${error.message}`);
  }

  return {
    path: objectPath,
    publicUrl: supabase.storage.from("receipts").getPublicUrl(objectPath).data?.publicUrl ?? null,
  };
}
