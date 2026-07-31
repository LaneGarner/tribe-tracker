# App Store Connect preparation packet

Status: local draft only. Nothing in this document authorizes upload,
publication, product creation, or submission.

## App identity

- Name: TribeTracker
- Bundle ID: `com.lanegarner.tribetracker`
- App Store Connect app ID: `6758316938`
- Primary category: Health & Fitness
- Secondary category: Lifestyle
- Audience: adults
- Kids category: no

### Subtitle

`Habits are better together`

### Promotional text

Build routines with supportive challenges, simple daily check-ins, and
accountability from people you choose.

### Description

TribeTracker is an adult wellness and habit-support app built around shared
challenges.

Create a personal challenge or join one from a friend, Team, or Organization.
Check in each day, see your current streak, and stay connected through
leaderboards and challenge conversation.

Free includes:

- One active personal challenge
- Unlimited invited and Organization challenges
- Daily check-ins and leaderboards
- Current streak tracking
- Basic challenge chat and safety tools
- A basic badge collection

Individual Pro adds unlimited personal challenge creation, AI-assisted
challenge drafts you review before using, advanced streak and activity
insights, complete history, expanded badges and levels, guided programs,
customization, and enhanced accountability features.

Eligible adults may also receive Sponsored Pro through an Organization
invitation. Organization reporting is aggregate-only and designed to protect
individual wellness information.

TribeTracker provides general wellness and habit-support features. It does not
provide diagnosis or treatment and is not a substitute for qualified care.

### Keywords

`habits,challenges,accountability,routines,streaks,goals,wellness,checklist,teams`

### URLs

- Privacy: `https://tribe-tracker-backend.vercel.app/privacy`
- Terms: `https://tribe-tracker-backend.vercel.app/terms`
- Support: `https://tribe-tracker-backend.vercel.app/support`
- Account deletion:
  `https://tribe-tracker-backend.vercel.app/delete-account`
- Community Guidelines:
  `https://tribe-tracker-backend.vercel.app/community-guidelines`

These URLs must be deployed and checked over HTTPS before they are entered in
App Store Connect.

## Individual Pro products

Create one auto-renewable subscription group named **TribeTracker Pro**.

### Monthly

- Reference name: TribeTracker Pro Monthly
- Product ID: `tribetracker_pro_monthly`
- Duration: 1 month
- US working price: $4.99
- Display name: Pro Monthly
- Description: Unlimited challenges and the complete Pro habit-support toolkit.

### Annual

- Reference name: TribeTracker Pro Annual
- Product ID: `tribetracker_pro_annual`
- Duration: 1 year
- US working price: $39.99
- Display name: Pro Annual
- Description: A year of unlimited challenges and the complete Pro toolkit.

The app must display Apple-provided localized prices. Each product needs
localization, availability, tax/banking readiness, and an App Review screenshot.
The first subscriptions are submitted with the app version only after explicit
approval.

## Paywall disclosure checklist

- Product name and localized price
- Billing period
- Automatic-renewal explanation
- The features unlocked
- Restore Purchases
- Manage Subscription for existing subscribers
- Privacy Policy
- Terms of Service
- Clear close/continue-with-Free control
- No external consumer checkout
- No hardcoded USD price in the purchase control

## App Privacy working declaration

The final answers must be regenerated from the production build and SDK list.
Expected categories are:

| Data | Purpose | Linked to user | Tracking |
| --- | --- | --- | --- |
| Email address | Account and authentication | Yes | No |
| Name/display name | App functionality | Yes | No |
| User ID | Account and app functionality | Yes | No |
| Profile photo | App functionality | Yes | No |
| User content: challenges and messages | App functionality and safety | Yes | No |
| Product interaction/check-ins | App functionality and analytics | Yes | No |
| Purchase history/status | Subscription entitlement | Yes | No |
| Diagnostics, if enabled in final SDKs | App functionality | Confirm | No |

Also disclose:

- Supabase authentication, storage, and database processing
- Vercel hosting and API processing
- OpenAI processing for optional AI-assisted features after explicit consent
- Apple purchase processing
- Push tokens used for notifications
- No advertising identifier or cross-company tracking at launch

Do not mark a data type collected merely because it exists in old source code.
Do mark it collected if the production app, backend, or an included SDK actually
transmits it.

## Screenshot plan

Capture only production-ready screens with synthetic data:

1. Home and daily check-in
2. Challenge details and habit checklist
3. Discover or invitation-based participation
4. Leaderboard and current streak
5. Supportive challenge conversation
6. Pro challenge generation draft-review screen
7. Pro analytics/history
8. Organization or Team participation, if understandable to consumers

Do not show:

- Real Turner data
- Child, student, district, or placeholder interfaces
- Debug controls
- Unsupported clinical claims
- A price that differs from the current App Store localization
- Administrative person-level wellness data

If iPad support remains enabled, create and verify the required iPad sizes.

## Review Notes draft

TribeTracker is an adult wellness and habit-support app with Free, Individual
Pro, and organization-sponsored access.

Free users can create one active personal challenge and join unlimited invited
or Organization challenges. Individual Pro is purchased using Apple In-App
Purchase and adds unlimited personal challenge creation and the Pro feature
set. Restore Purchases and Manage Subscription are available from Membership.

Sponsored Pro is access assigned to an invited adult by an Organization. There
is no Organization pricing, checkout, purchase link, or external purchase call
to action in the iOS app. The Organization and its authorized managers control
membership through invitations or secure join links.

The supplied demo accounts cover Free with no active challenge, Free at its
creation limit, active Individual Pro, expired Pro, Sponsored Member, Team
Manager, Organization Manager, and a combined Organization Manager/Team
Manager.
Additional credentials and exact steps are listed below.

To review user safety, sign in with the supplied Member accounts, open the
sample challenge conversation, and use Report or Block from the message/user
actions. The web-only Platform Moderator account demonstrates report resolution
if requested.

To review AI-assisted challenge generation, sign in with Individual Pro, open
Create Challenge, choose Generate Draft, accept the data-processing disclosure,
and review/edit the returned draft before saving.

To review account deletion, open Menu, Privacy & Account, Delete Account. The
flow explains Apple subscription management before final confirmation.

Camera/photo access is optional and is used for profile or challenge images.
Notifications are optional and are used for reminders and challenge updates.
Core functionality remains available when these permissions are denied.

## Reviewer credentials attachment

Populate credentials only in the secure App Review Information fields and
Review Notes at submission time. Never commit passwords here.

The minimum reviewer bundle is:

1. **Free** — demonstrates the normal experience and the one-active-personal-
   challenge boundary.
2. **Individual Pro** — exposes every consumer subscription capability without
   requiring the reviewer to make a purchase.
3. **Organization Manager with Sponsored Pro** — exposes organization and team
   management without an external checkout.
4. **Second Member** — supports chat, report, block, invitation, and removal
   testing.

All credentials must be reusable, location-independent, verified in advance,
and exempt from OTP, MFA, and approval by a real manager. The Pro fixture must
remain entitled throughout review. Store sandbox purchase instructions can be
included as an additional test path, but must not be the only way to inspect
paid functionality.

Use the Free account for any Apple or Google sandbox purchase and restore test.
The Individual Pro fixture intentionally bypasses purchase so all paid screens
remain reviewable. Sponsored Pro is an organization-assigned entitlement, not a
separate App Store or Google Play subscription.

| Label | Email | Password | Reset procedure verified |
| --- | --- | --- | --- |
| Free new | Pending secure creation | Not stored here | Pending |
| Free limit | Pending secure creation | Not stored here | Pending |
| Individual Pro | Pending secure creation | Not stored here | Pending |
| Expired Pro | Pending secure creation | Not stored here | Pending |
| Sponsored Member | Pending secure creation | Not stored here | Pending |
| Team Manager | Pending secure creation | Not stored here | Pending |
| Organization Manager | Pending secure creation | Not stored here | Pending |
| Combined Manager | Pending secure creation | Not stored here | Pending |
| Second Member | Pending secure creation | Not stored here | Pending |
| Platform Moderator | Pending secure creation | Not stored here | Pending |

## Manual sequence after approval

1. Confirm Apple Developer agreements, tax, banking, contact, and legal entity.
2. Deploy the approved backend, migrations, portal, and public policy pages.
3. Create the subscription group and two products.
4. Configure verified server notifications and subscription entitlement sync.
5. Create/reset synthetic reviewer accounts using the approved secure script.
6. Run production-like reviewer-account and purchase tests.
7. Produce the final signed iOS build.
8. Upload the build without submitting it and re-run TestFlight acceptance.
9. Enter listing metadata, privacy answers, age rating, screenshots, product
   metadata, contact details, credentials, and Review Notes.
10. Conduct the final red/yellow/green readiness review.
11. Obtain Lane's explicit approval.
12. Submit the app version and first subscription products together.

The current task stops before step 1 performs any external change.
