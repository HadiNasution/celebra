# Template System
Templates are the foundation of the platform.

Templates must remain reusable, versioned, and data-driven.

---

# Core Concepts

Template

Defines complete page layout, styling, and editable sections. Admin uploads as an HTML/CSS/JS bundle.

Theme

Theme is part of the template (inline/internal/external CSS). No separate theme in MVP.

Asset Pack

Provides reusable decorative assets (optional, not required for MVP).

Schema

Defines editable fields. Format: `{{key.name}}` placeholders in HTML + JSON Schema for field metadata.

---

# Template Flow
```
Admin uploads HTML/CSS/JS → stored as template
→ User selects template from catalog
→ Editor form-driven → edit content (content_json)
→ Preview → Publish
```

---

# Schema Format (Hybrid)
Every template must have:

1. **Placeholders in HTML** — `{{section.field}}` to define content positions
   - Example: `{{hero.title}}`, `{{bride.name}}`, `{{gallery.images}}`
2. **JSON Schema file** — Defines field metadata: type, label, validation, grouping
   - Field types: text, textarea, image, gallery, date, map, music, color
   - Validation: required, min/max, pattern
   - Grouping: section-based grouping for the form editor panel

---

# Editable Data
Templates must never hardcode content.

Every editable value must come from a placeholder.

Example sections and fields:
Hero
- Title (`{{hero.title}}`)
- Subtitle (`{{hero.subtitle}}`)
- Background Image (`{{hero.background_image}}`)

Gallery
- Images (`{{gallery.images}}`)

Countdown
- Event Date (`{{countdown.event_date}}`)

Maps
- Latitude (`{{maps.lat}}`)
- Longitude (`{{maps.lng}}`)

Music
- Audio URL (`{{music.url}}`)

---

# Versioning
Templates must be versioned.

Updating a template must never break published invitations.

Existing invitations freeze at the template version they were created with.

No migration tool in MVP. Migration strategy added when real-world cases emerge.

---

# Rendering
Visual Editor:
- Renders raw HTML template in an iframe
- Form panel on the side edits data according to schema
- Changes in form → inject content_json into placeholders → re-render iframe

Preview:
- Uses the same renderer as the editor (what you see is what you get)

Publish:
- Same renderer injects final content_json into the HTML template
- Generates hybrid page (ISG for static content, API routes for dynamic features)

Published website never depends on editor runtime.

---

# Design System Scope
Public invitation uses the design system from the template HTML/CSS/JS (custom, not shadcn/ui).

shadcn/ui is only used for dashboards (admin, customer, scanner).

---

# Future Compatibility
New template versions should provide migration strategies.

Never modify customer content automatically.
