// DEPRECATED: This file was a misspelled duplicate (lib/supabe.ts).
// It now re-exports the validated client implementation from lib/supabase.ts
// to avoid build/runtime breaks. Remove this file and update imports to
// import from lib/supabase.ts in the future.

export { createSupabaseClient as default, createSupabaseClient } from "./supabase";
