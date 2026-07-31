# TribeTracker launch product contract

This document is the implementation source of truth for the first public
mobile release and the initial organization pilot.

## Memberships and capabilities

Membership and management authority are independent.

| Capability | Free | Individual Pro | Sponsored Pro |
| --- | --- | --- | --- |
| Join invited and organization challenges | Unlimited | Unlimited | Unlimited |
| Create personal challenges | One active | Unlimited | Unlimited |
| Check-ins and leaderboards | Included | Included | Included |
| Current streak | Included | Included | Included |
| Basic challenge chat and safety tools | Included | Included | Included |
| Basic badges | Included | Included | Included |
| AI-generated challenge drafts | — | Included | Included |
| Advanced streaks, analytics, and full history | — | Included | Included |
| Expanded badges and levels | — | Included | Included |
| Guided programs and customization | — | Included | Included |
| Enhanced accountability features | — | Included | Included |

An active personal challenge includes an upcoming, active, ongoing, or
recurring-gap personal challenge. Completed personal challenges do not consume
the Free slot. Team and organization challenges never consume it.

Basic badges include getting-started milestones and entry achievements.
Deeper streak, volume, social, podium, win, and level progression requires
Pro. Badges earned during a paid period remain in the member's history after
downgrade, while new Pro badges stop progressing until Pro access returns.

Individual Pro is offered at $4.99 monthly and $39.99 annually. Storefronts
must display the localized price returned by Apple or Google rather than
hardcoded price text.

Sponsored Pro is a server entitlement assigned through an active organization
membership. It is not an Apple promotional code. The initial Turner pilot
receives 12 months of Sponsored Pro for eligible invited members. Access is accepted
through an invitation or a secure organization/team join link; an email domain
alone does not grant access.

## Organization commercial terms

Organization licenses are based on the eligible group size rather than the
customer's industry. The initial $3,000 / $8,000 / $15,000 annual bands are
AI-generated planning suggestions, not approved prices. They must be reviewed
against pilot usage, support cost, procurement expectations, and comparable
products before being quoted or published.

The Turner pilot is free for 12 months. Its scope and conversion terms must be
documented before launch so the pilot does not silently roll into a paid
commitment.

## Roles

- **Member:** participates in available challenges.
- **Team Manager:** manages assigned team rosters, invitations and join links,
  team challenges, and privacy-safe team aggregates.
- **Organization Manager:** manages organization membership, teams, Team
  Manager assignments, organization challenges, Sponsored Pro access, and
  organization-wide aggregates. Organization Managers can also perform Team
  Manager actions for every team in their organization.
- **Platform Admin:** internal TribeTracker moderation and support role.

One person can hold multiple scoped management roles, including across
organizations. Removing a person from an
organization removes organization roles and Sponsored Pro but preserves their
personal account and personal history.

## Organization privacy and invitations

Organization reporting contains aggregate adoption, participation, check-in,
completion, retention, and trend data. It must not expose messages, routines,
coaching content, or person-level wellness history. Aggregate results remain
visible at every team size; the interface must not imply that a result is
statistically representative when the underlying group is small.

Manual add-by-email sends an invitation when the person is not already an
organization member. It never silently creates an account. Join links are
opaque, scoped, expiring, revocable, optionally usage-limited, and audited.

## Safety and content positioning

Launch is for adults invited to participating organizations. Student and child
accounts are not included.

Use wellness, habit support, guided, and evidence-informed language. Do not
claim diagnosis, treatment, addiction recovery treatment, guaranteed behavior
change, or replacement of qualified care.

Basic report, block, reply, edit, and other safety functions remain Free.
Enhanced accountability may include manager broadcasts and pins, AI recaps,
and additional prompts.

## Store purchase boundary

Consumer Individual Pro sold in the mobile apps uses Apple In-App Purchase or
Google Play Billing. The app includes purchase, restore, subscription
management, and complete subscription lifecycle handling.

Organization pricing and checkout are not displayed in the mobile app at
launch. Sponsored users sign in to access an entitlement already assigned by
their organization. App Review notes must explain this distinction.

## App Review demo accounts

All review accounts live in a synthetic App Review Demo Organization and use no
Turner or customer data.

| Fixture | State to demonstrate |
| --- | --- |
| Free new | No active personal challenge |
| Free at limit | One active personal challenge |
| Individual Pro | Active store-backed Pro |
| Expired Pro | Downgraded with history preserved |
| Sponsored Member | Sponsored Pro with no management role |
| Team Manager | Sponsored Pro and one scoped team |
| Organization Manager | Sponsored Pro and organization-wide authority |
| Combined Manager | Organization Manager and Team Manager simultaneously |
| Second Member | Chat, report, block, invitation, and removal target |
| Platform Moderator | Web-only moderation queue and audit access |

Credentials must remain active throughout review, require no external person or
one-time code, and contain representative challenges, chat, check-ins,
leaderboards, invitations, reports, and aggregates for both small and large
teams.

## Non-negotiable launch gates

- Server-authoritative permissions, roles, entitlements, and paid writes
- Apple/Google sandbox purchase, restore, expiration, refund, and revocation
- In-app account deletion and subscription-management explanation
- Report, block, filtering, moderation queue, contact information, and
  community guidelines
- Explicit consent before personal data is shared with an AI provider
- Working public Terms, Privacy, Support, and Community Guidelines URLs
- Accurate privacy/data-safety declarations and permission descriptions
- No child, district, placeholder, debug, or unsupported clinical launch UI
- Green unit, type, integration, E2E, accessibility, and real-device checks
