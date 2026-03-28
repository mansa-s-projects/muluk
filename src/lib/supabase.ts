
import { createClient } from "@supabase/supabase-js";

function getSupabaseEnv() {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !/^https?:\/\//.test(supabaseUrl)) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL.");
	}

	if (!supabaseKey) {
		throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required.");
	}

	return { supabaseUrl, supabaseKey };
}

export function createSupabaseClient() {
	const { supabaseUrl, supabaseKey } = getSupabaseEnv();
	return createClient(supabaseUrl, supabaseKey);
}