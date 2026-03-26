import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { challengeId, joinerName, joinerUserId } = await req.json();

    if (!challengeId || !joinerUserId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up challenge creator and name
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .select("creator_id, name")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      console.error("Challenge lookup failed:", challengeError);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if creator is joining their own challenge
    if (challenge.creator_id === joinerUserId) {
      return new Response(JSON.stringify({ ok: true, skipped: "own_challenge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up creator profile
    const { data: creator, error: creatorError } = await supabase
      .from("profiles")
      .select("email, full_name, email_notifications")
      .eq("id", challenge.creator_id)
      .single();

    if (creatorError || !creator) {
      console.error("Creator lookup failed:", creatorError);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if creator has email notifications disabled
    if (creator.email_notifications === false) {
      return new Response(JSON.stringify({ ok: true, skipped: "notifications_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!creator.email) {
      console.error("Creator has no email");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID");
    const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
    const gmailRefreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");
    const gmailFromEmail = Deno.env.get("GMAIL_FROM_EMAIL");

    if (!gmailClientId || !gmailClientSecret || !gmailRefreshToken || !gmailFromEmail) {
      console.warn("Gmail credentials not configured — skipping email notification");
      return new Response(JSON.stringify({ ok: true, skipped: "gmail_not_configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creatorName = creator.full_name || "there";
    const challengeName = challenge.name || "Untitled Challenge";
    const displayJoinerName = joinerName || "Someone";

    // Exchange refresh token for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: gmailClientId,
        client_secret: gmailClientSecret,
        refresh_token: gmailRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Gmail token exchange failed:", tokenRes.status, errText);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token } = await tokenRes.json();

    const subject = `${displayJoinerName} joined your challenge "${challengeName}"`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:28px;font-weight:800;color:#60A5FA;">TribeTracker</span>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a2e;border-radius:16px;padding:32px 24px;border:1px solid #2a2a3e;">
              <p style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px 0;">
                Hey ${escapeHtml(creatorName)},
              </p>
              <p style="color:#D1D5DB;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
                <strong style="color:#fff;">${escapeHtml(displayJoinerName)}</strong> just joined your challenge
                <strong style="color:#60A5FA;">&ldquo;${escapeHtml(challengeName)}&rdquo;</strong> on TribeTracker!
              </p>
              <p style="color:#9CA3AF;font-size:14px;margin:0;">
                Open the app to see your challenge.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:#4B5563;font-size:12px;margin:0;">
                You&rsquo;re receiving this because you have email notifications enabled.
                You can turn them off in the app under Menu &rarr; Notifications.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Build RFC 2822 MIME message and base64url-encode it
    const mimeMessage = [
      `From: TribeTracker <${gmailFromEmail}>`,
      `To: ${creator.email}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      htmlBody,
    ].join("\r\n");

    const rawMessage = btoa(unescape(encodeURIComponent(mimeMessage)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ raw: rawMessage }),
      },
    );

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Gmail send failed:", sendRes.status, errText);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-join error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
