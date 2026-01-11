import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

serve(async (req) => {
  // Get the origin for CORS
  const origin = req.headers.get("origin") || "";
  
  // Allow localhost for development and the production domain
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
  ];
  
  // Also allow any lovable.app subdomain
  const isAllowedOrigin = allowedOrigins.includes(origin) || 
    origin.endsWith(".lovable.app") ||
    origin.endsWith(".lovableproject.com");
  
  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authentication to access ICE servers (especially TURN credentials)
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the JWT token
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    console.error("[ice-servers] Auth error:", authError?.message || "No user");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[ice-servers] Authenticated user:", user.id);

  // Fast STUN-only default. TURN can be enabled by setting env vars:
  // TURN_URLS (comma separated), TURN_USERNAME, TURN_CREDENTIAL
  const iceServers: IceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrlsRaw = Deno.env.get("TURN_URLS") ?? "";
  const turnUsername = Deno.env.get("TURN_USERNAME") ?? "";
  const turnCredential = Deno.env.get("TURN_CREDENTIAL") ?? "";

  const turnUrls = turnUrlsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (turnUrls.length && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
    console.log("[ice-servers] TURN servers configured");
  }

  return new Response(JSON.stringify({ iceServers }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
