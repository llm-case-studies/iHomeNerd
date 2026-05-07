# Command Center Language Parity

## Goal

Make the Command Center language behavior match the landing page closely enough
that a user can move from public setup flow into the app without the interface
silently snapping back to English or mixing old product copy with current
language choices.

This is a uniform-web-ui sprint because it concerns the shared menu surface:
language selector, translated shell labels, chat language handoff, Talk/Translate
language controls, and visible user-facing copy.

## Why This Sprint Exists

Both `landing/` and `frontend/` already use `react-i18next` and advertise the
same ten UI languages. But the two apps have separate copied language resources,
the English copy has drifted, and several Command Center panels still contain
hard-coded English.

The first pass should make language support honest and coherent without trying
to fully localize every diagnostic field in the system dashboard.
