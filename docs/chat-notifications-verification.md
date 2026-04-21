# Chat Notifications Verification (post Chat-tab removal)

## Summary

After removing the Chat tab from the bottom tab navigator, chat push
notifications still register, fire, and open the app. Nothing in the
notification pipeline depended on the Chat tab's presence.

## Findings

- **Registration is tab-independent.** `utils/notifications.ts`
  configures the notification handler and registers the Android
  `chat-messages` channel at app start. `DEFAULT_NOTIFICATION_SETTINGS`
  still exposes `chatDmEnabled` and `chatGroupEnabled`. None of this
  code references the removed tab.
- **Firing is tab-independent.** The Supabase edge function
  `supabase/functions/notify-chat-message/index.ts` sends Expo push
  messages with `data: { conversationId, type: "chat" }` and
  `channelId: "chat-messages"`. It contains no route or tab name.
- **Chat screen is still reachable.** The `Chat` screen remains
  registered in `RootNavigator` and is pushed modally (not from a tab
  slot). The Menu screen and conversation list both continue to
  navigate into it.
- **Deep linking unaffected.** `App.tsx`'s `linking.config.screens`
  maps only `CreateChallenge` and `ChallengeDetail`. There is no
  `chat/...` deep-link path and the chat push payload does not rely on
  one.

## Pre-existing gap (out of scope)

The codebase does not install a notification-response listener
(`Notifications.addNotificationResponseReceivedListener` /
`getLastNotificationResponseAsync`) anywhere, so tapping a chat push
opens the app but does not auto-navigate to the relevant conversation.
This gap predates the Chat-tab removal and is unchanged by it.
Implementing tap-through navigation is tracked as follow-up work.
