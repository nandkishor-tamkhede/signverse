import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
  }

  return new Response(JSON.stringify({ iceServers }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
