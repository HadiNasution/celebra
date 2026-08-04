# Product Brief — Digital Invitation SaaS

## Product Vision
Build a multi-tenant SaaS platform for creating website-based digital invitations that are easy to use by non-technical users. The platform provides a visual editor, template system, static website generator, guest management, and QR Check-in.

---

# Supported Use Cases
The platform must support various event types, including:
* Wedding
* Birthday
* Family Gathering
* School Event
* Corporate Internal Event
* Seminar
* Gathering
* Graduation

---

# Business Model
The platform uses a Software as a Service (SaaS) model.

## Revenue
1. Subscription plans based on hosting duration (1–12 months).
2. Sales of premium features, such as:
   * QR Check-in
   * Guest Role
   * Localization
   * Integrations
   * Premium Template
3. Future premium template sales.

## Customer Experience
* Customers have an account to manage invitations.
* Every new customer gets a free trial period (default 14 days).
* Customers can create, edit, publish, and manage invitations independently.
* Once published, invitations are accessible via a public URL.
* After the active period expires, the invitation will be deactivated according to the service policy.

---

# Product Scope

## Landing Website
Serves as the marketing website.

Features:
* Home
* Pricing
* FAQ
* Demo
* Contact

---

## Admin Panel
Used for platform operations.

Features:
* Dashboard
* Customer Management
* Subscription Management
* Hosting Activation
* Template Management
* Theme Management
* Asset Pack Management
* Category Management
* Domain Management
* Publish Monitoring
* Analytics
* Customer Support

---

## Customer Dashboard
The main area for customers to manage invitations.

### Authentication
* Login
* Forgot Password

### Invitation Management
* Create Invitation
* Duplicate Invitation
* Archive Invitation
* Draft
* Publish

### Template Catalog
* Browse Category
* Search
* Preview Template

### Visual Editor
No-code visual editor for managing invitation content.

Editable content:
* Event Information
* Bride / Groom
* Schedule
* Maps
* Gallery
* Music
* Countdown
* Bank Information
* Additional Information
* Theme
* Asset Pack
* Optional Sections

### Guest Management
* CRUD Guest
* Import CSV/XLSX
* Guest Role
* QR Generation
* RSVP

### Preview
* Desktop Preview
* Mobile Preview
* Publish
* Save Draft
* Reset

### Settings
* Localization
* WhatsApp Share
* Telegram Share
* Calendar Invite
* Printable PDF
* SEO
* Custom Domain (Future)

---

## Public Invitation
The invitation accessed by guests.

Features:
* Animation
* Music
* Gallery
* RSVP
* Guestbook
* Comment
* Upload one media item per guest (image, video, or voice note)
* Multi-language

Guests receive a personalized experience using a unique token.

---

## QR Check-in
Supports guest check-in using QR Code.

Main targets:
* Fast check-in process
* Remains usable when internet connection is unstable
* Data synchronization when connection becomes available again

---

# Core Product Principles
The platform must:
* Be easy to use by non-technical users.
* Have a simple invitation creation process.
* Prioritize visual experience over technical configuration.
* Support multiple event types using a flexible template system.
* Allow customers to manage all invitations from one dashboard.

---

# Non Functional Goals
The product must have the following characteristics:
* Multi Tenant
* Responsive
* Mobile First
* Offline Support for check-in
* Fast performance
* Secure
* Reliable
* Easy to develop
* Easy to maintain

---

# Risks
Areas with high complexity:
* Visual Editor
* Template Versioning
* Multi-tenant Data Isolation
* Offline Synchronization
* Media Storage Growth
* Static Site Publishing
* Template Migration

---

# MVP Roadmap
## Phase 1
* Landing Website
* Admin Panel
* Customer Dashboard
* Visual Editor
* Guest Management
* Publish Invitation
* Public Invitation

## Phase 2
* QR Check-in
* Offline Scanner
* Localization
* PDF Export

## Phase 3
* Premium Themes
* Analytics
* Custom Domain
* Integrations
* Template Marketplace
