# Shared iHomeNerd Extension Store Submission Checklist

**Date:** 2026-04-21  
**Target:** early beta submission for Chrome/Edge first, Firefox if packaging stays straightforward

## Submission Strategy

Optimize for a **narrow and boring** first submission.

The extension should be easy for store reviewers to understand:

- hosted learning apps talk to a user-selected local or LAN iHomeNerd node
- the extension only relays user-initiated requests
- the extension does not add cloud analytics or hidden routing

## Manifest / Permission Checklist

- `storage` only if needed for selected-brain config
- avoid broad permanent host permissions where optional origin grants work
- keep content-script matches limited to known app origins
- keep discovery permissions separate from the beta if they widen review scope
- no unnecessary tabs/history/downloads/nativeMessaging permissions

## Product Behavior Checklist

- user explicitly enters or selects a brain URL
- user explicitly grants access to that origin
- user can test the configured origin
- extension clearly shows current target
- extension only reaches configured or user-approved origins
- failure states are user-readable

## Reviewer-Risk Items To Avoid

- silent network scanning across the LAN on install
- broad wildcard access without a clear need
- vague language like "AI helper for anything"
- hidden background activity unrelated to the active app
- making the extension look like a remote-control tool

## Privacy Copy Checklist

State these points plainly:

- selected node addresses stay in browser extension storage
- requests are sent only to the user-selected local or LAN node
- the extension itself does not sync user data to a cloud service
- app data handling is determined by the connected app and node
- users can remove the extension and clear its settings

## Setup Copy Checklist

The setup flow should read like this:

1. Install the iHomeNerd Bridge extension.
2. Open the extension popup.
3. Enter or discover your local brain URL.
4. Save and grant access to that node.
5. Run `Test connection`.
6. Return to the app and reload if needed.

Avoid wording that implies:

- OS-level daemon install
- permanent device scanning
- enterprise endpoint control

## Asset Checklist

- 1 screenshot of popup with healthy connected state
- 1 screenshot of popup showing a clear permission/fetch error
- short icon set that looks product-stable, not experimental
- one-sentence description
- longer description with local/LAN emphasis
- privacy policy page if store requires it
- support URL

## Diagnostic UX Checklist

- show selected brain URL
- show permission granted/missing
- show probe success/failure
- show product/version/models or capability summary
- include certificate hint for remote HTTPS with self-signed certs
- include `.local` fallback hint to use the node IP

## Beta Submission Notes

- mention that the extension is used by first-party apps that connect to a user-controlled iHomeNerd node
- mention that host access is user-directed and testable
- mention that the extension solves browser CORS/mixed-content limitations for secure hosted apps

## Launch Readiness Gate

Do not submit until these are true:

- PronunCo staging works through the shared extension
- the popup copy is clear and stable
- permissions are minimal
- uninstall leaves no OS-level residue because the product is extension-only
- there is one concise support doc the reviewer can understand in under two minutes
