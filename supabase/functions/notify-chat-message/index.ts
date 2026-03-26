import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationSettings {
  pushEnabled?: boolean;
  chatDmEnabled?: boolean;
  chatGroupEnabled?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { conversationId, senderId, senderName, content } = await req.json();

    if (!conversationId || !senderId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up conversation details
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("type, name")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      console.error("Conversation lookup failed:", convError);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGroupChat = conversation.type === "group";

    // Get all active members of the conversation (excluding sender)
    const { data: members, error: membersError } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("status", "active")
      .neq("user_id", senderId);

    if (membersError || !members || members.length === 0) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const memberIds = members.map((m: any) => m.user_id);

    // Fetch profiles with push tokens and notification settings
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, expo_push_token, notification_settings, full_name")
      .in("id", memberIds);

    if (profilesError || !profiles) {
      console.error("Profiles lookup failed:", profilesError);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build push notification payloads
    const pushMessages: any[] = [];

    for (const profile of profiles) {
      if (!profile.expo_push_token) continue;

      const settings: NotificationSettings = profile.notification_settings ?? {};

      // Check master push toggle (default: enabled)
      if (settings.pushEnabled === false) continue;

      // Check chat-specific toggles
      if (isGroupChat && settings.chatGroupEnabled === false) continue;
      if (!isGroupChat && settings.chatDmEnabled === false) continue;

      const title = isGroupChat
        ? conversation.name || "Group Chat"
        : senderName || "New Message";

      const body = isGroupChat
        ? `${senderName || "Someone"}: ${content || ""}`
        : content || "";

      pushMessages.push({
        to: profile.expo_push_token,
        title,
        body: body.substring(0, 178),
        data: { conversationId, type: "chat" },
        sound: "default",
        channelId: "chat-messages",
      });
    }

    if (pushMessages.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Expo Push API (batch)
    const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pushMessages),
    });

    if (!pushResponse.ok) {
      const errText = await pushResponse.text();
      console.error("Expo Push API error:", pushResponse.status, errText);
    }

    return new Response(
      JSON.stringify({ ok: true, sent: pushMessages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-chat-message error:", err);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
