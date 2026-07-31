# Apple App Review runbook

Run this checklist for every build submitted to Apple. Do not place reviewer
passwords or service-role keys in this repository.

## Reviewer environment

Use a synthetic organization named **App Review Demo Organization**. Its users,
messages, challenges, reports, and activity must not contain real customer or
Turner High School data.

Create and verify these fixture states:

1. Free account with no active personal challenge.
2. Free account with one active personal challenge.
3. Individual Pro account with an active entitlement.
4. Account whose Individual Pro entitlement has expired.
5. Sponsored Pro Member.
6. Sponsored Pro Team Manager scoped to one team.
7. Sponsored Pro Organization Manager.
8. Sponsored Pro user holding Organization Manager and Team Manager together.
9. Second Member available for chat, report, block, invite, and removal tests.
10. Web-only Platform Moderator when the moderation workflow needs review.

The organization must have:

- Representative personal, team, and organization challenges
- Check-ins, current and historical streak data, badges, and leaderboards
- Safe example chat content
- One open content report
- Active, expired, revoked, and usage-limited invitation examples
- Aggregate results for both a one-person team and a larger team

Reviewer accounts must have confirmed email addresses and stable passwords.
They must not require an emailed code, MFA, approval by a real manager, or
access to a real email inbox during review. Reset fixture state before each
submission and keep credentials active until the review is complete.

## Automated preflight

The release pipeline must fail unless it verifies:

- Every reviewer credential can authenticate
- The expected membership, entitlement source, expiration, and additive roles
- Team Manager denial outside assigned teams
- Organization Manager denial outside the assigned organization
- Free challenge creation succeeds at zero active personal challenges
- Free challenge creation is denied at one active personal challenge
- Invited and organization challenges do not consume the Free personal slot
- Sponsored Pro begins and ends with eligible organization coverage
- Removed members retain their personal account and history
- Aggregate results remain scoped to the selected organization or team
- Report, block, moderation, audit, and account-deletion workflows
- AI consent is recorded before personal information is processed
- Purchase, restore, expiration, grace period, refund, and revocation states
- All legal, support, and store URLs return successful HTTPS responses
- No production customer data is present

## App Store Connect information

Supply a primary demo login in the App Review Information fields. Put the
additional role-specific credentials and exact testing steps in Review Notes.
Include a reachable contact name, email, and phone number.

At minimum, provide Free, Individual Pro, Organization Manager with Sponsored
Pro, and Second Member credentials. Review must never depend on making a real
purchase, receiving a one-time code, or waiting for a real manager. Subscription
sandbox steps may be supplied as a separate purchase test.

Use the **Free** account for the sandbox purchase and restore path. Use the
**Individual Pro** account to inspect all consumer paid capabilities without a
transaction. Use the **Organization Manager with Sponsored Pro** account for
organization and team features; explain that this access is assigned by the
organization and is not another consumer subscription product.

The notes must explain:

- Free allows one active self-created personal challenge and unlimited joining.
- Free includes starter and entry-level badges. Deeper badge progression and
  levels require Pro; previously earned badges remain visible after downgrade.
- Individual Pro is purchased through Apple and unlocks the listed Pro
  capabilities.
- Sponsored Pro is assigned by an organization to an invited adult member.
- No organization pricing, checkout, or external purchase call to action
  appears in the iOS app.
- A person can manage multiple organizations or teams when assigned.
- Where to purchase, restore, and manage Individual Pro.
- Where to report content, block a user, and initiate account deletion.
- Where AI consent appears and how a generated draft is reviewed before use.
- Why camera/photos and notifications may be requested.
- How to access the web moderation/admin view if it is needed to review an
  in-app workflow.

## In-app subscription review

- Monthly product: `tribetracker_pro_monthly`
- Annual product: `tribetracker_pro_annual`
- One subscription group
- Localized names, descriptions, and prices
- A complete review screenshot for each product
- Privacy Policy and Terms links visible on the paywall
- Duration and auto-renewal clearly stated
- Restore Purchases visible without requiring a new purchase
- Manage Subscription available to subscribers
- First subscription products submitted with the app version
- Server notifications and entitlement updates live during review

Do not hardcode USD prices into purchase controls. The approved business prices
are $4.99 monthly and $39.99 annually, but the interface displays the localized
store response.

## Google Play review fields

- Put the same stable credentials and step-by-step role instructions in
  **Policy and programs > App content > App access**.
- Mark every screen or feature restriction and explain which supplied account
  unlocks it.
- Provide the public account-deletion URL:
  `https://tribe-tracker-backend.vercel.app/delete-account`.
- Reconcile Data safety answers against the final production SDKs and backend,
  including account information, user content, app activity, purchase status,
  push tokens, optional photos, and optional AI prompts.
- Complete the Health apps declaration for the app's general wellness and habit
  support functionality; do not describe TribeTracker as diagnosing, treating,
  or monitoring a medical condition.
- Declare the app's AI-generated content features and describe the in-app
  reporting control for generated drafts.
- Declare chat and challenge content as user-generated content, and identify
  the report, block, automated screening, human moderation, Terms, and Community
  Guidelines controls.
- Use Google Play license testers and an internal testing track to verify
  purchase, renewal, cancellation, restore, grace, refund, and revocation.

## Manual device pass

Test a clean production build on supported physical iPhone models. If iPad
support is enabled, complete the same pass on iPad and provide correct iPad
screenshots.

Verify:

- Clean install, signup, adult confirmation, onboarding, logout, and login
- Denied camera/photo/notification permissions do not block core use
- Purchase, restore, manage subscription, and account deletion
- Free, Pro, Sponsored, Manager, Admin, and dual-role navigation
- Invitation deep links from installed and cold-start states
- Offline use, reconnect, stale entitlements, and expired invitations
- VoiceOver labels, Dynamic Type, keyboard focus where applicable, contrast,
  loading, empty, and error states
- No placeholder, district, child, debug, or unfinished screens
- Version shown in the app matches the submitted build

## Final release decision

Do not submit with a known crash, type error, failing test, broken URL, inactive
backend, inaccessible reviewer account, unused sensitive permission, unresolved
privacy disclosure, or P0/P1 defect.
