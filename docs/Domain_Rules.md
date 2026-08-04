# Domain Rules
This document defines immutable business rules of the platform.

---

# Invitation
- Every invitation belongs to one tenant.
- An invitation uses one template version.
- Theme is part of the template (CSS embedded within the HTML/CSS/JS bundle).
- Invitations support Draft and Published states.
- Publishing creates a static snapshot via hybrid ISG + API routes.

Published invitations should not be edited directly.

---

# Guest
- Every guest belongs to one invitation.
- Every guest receives one unique token (UUID).
- Guest token identifies personalized invitation access.
- Guest token must remain unique within an invitation.

---

# RSVP
- One guest may submit RSVP only once.
- RSVP may be updated until the event starts.
- RSVP must be associated with a guest token.

---

# QR Check-in
- One guest may check in once.
- Duplicate scans should be rejected.
- Offline scans must be synchronized safely.
- Conflict resolution must preserve attendance integrity.

---

# Media Upload
Guest may upload at most one media item.

Supported:
- Image
- Video
- Voice Note

---

# Publish
Publishing:
- Inject content_json into template HTML placeholders
- Generate hybrid page (ISG + dynamic components)
- Upload assets to R2
- Refresh CDN cache (Vercel ISR)

Publishing should never modify customer content.

---

# Customer Onboarding
- Customer fills name, phone, email, and selects a subscription plan on the checkout page.
- Payment is processed via Xendit (invoice-based).
- On payment success (Xendit callback): system auto-creates tenant, user, and subscription in a single transaction.
- A random password is generated for the user.
- Credentials (email + password + dashboard URL) are sent to the customer via email and WhatsApp.
- Only after onboarding is the customer able to log in.

# Subscription
- No free trial. Customer must pay to activate.
- Subscription plan is selected during checkout (1–12 months).
- Expired subscriptions: public invitation becomes unavailable.
- Dashboard remains accessible for renewal.
- Subscription changes must be recorded in Audit Log.

---

# Templates
Templates remain reusable.

Admin uploads template as an HTML/CSS/JS bundle.

Customer can only choose from the template catalog provided by admin.

Customer data must never be stored inside template definitions.

---

# Audit Log
Record:
- Publish
- Archive
- Delete
- Subscription changes
- Domain changes
- Payment events (create invoice, payment success, payment failure)