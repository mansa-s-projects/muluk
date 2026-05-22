import { NextResponse } from "next/server";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

type RpcEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

type SupabaseWithRpc = {
  rpc: (
    fn: string,
    args?: Record<string, string | number>
  ) => PromiseLike<RpcEnvelope<RateLimitResult[]>>;
};

export async function enforceRateLimit(
  supabase: SupabaseWithRpc,
  {
    route,
    limit,
    windowSeconds,
  }: { route: string; limit: number; windowSeconds: number }
): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed", { route, message: error.message });
    return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
  }

  const result = data?.[0];
  if (!result) {
    return NextResponse.json({ error: "Rate limiter unavailable" }, { status: 503 });
  }

  if (!result.allowed) {
    const retryAfter = Math.max(
      1,
      Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  }

  return null;
}
