import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "Missing SUPABASE_SERVICE_ROLE_KEY")
    .optional(),
});

const clientEnv = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!clientEnv.success) {
  const { fieldErrors } = clientEnv.error.flatten();
  const missing = Object.entries(fieldErrors)
    .filter(([, errors]) => errors && errors.length > 0)
    .map(([key, errors]) => `${key}: ${errors?.join(", ") ?? "unknown error"}`);

  throw new Error(
    `Invalid Supabase public environment variables:\n${missing.join("\n")}`,
  );
}

const serverEnv = serverSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!serverEnv.success) {
  const { fieldErrors } = serverEnv.error.flatten();
  const missing = Object.entries(fieldErrors)
    .filter(([, errors]) => errors && errors.length > 0)
    .map(([key, errors]) => `${key}: ${errors?.join(", ") ?? "unknown error"}`);
  throw new Error(
    `Invalid Supabase server environment variables:\n${missing.join("\n")}`,
  );
}

export const env = {
  ...clientEnv.data,
  ...serverEnv.data,
};
