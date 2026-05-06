# iPhone-Mac Pairing Approval

This sprint turns the iPhone Mac setup route from an informational concierge
page into an explicit user-approved pairing step.

The important boundary:

- a Mac on the LAN may request pairing and poll its status
- the iPhone app owner approves or denies the request in the iPhone UI
- there is no unauthenticated LAN route that approves a Mac
- there is no Home CA private key handoff in this sprint

## Files

- `00-opencode-kickoff.md` - prompt to start the implementation agent
- `01-brief.md` - sprint scope and expected behavior
- `02-result-template.md` - implementation result template
- `03-merge-note-template.md` - merge note template after validation

## Related Testing Request

- `testing/initiatives/iphone-to-mac-brain/2026-05-04_iphone-mac-pairing-approval/request.md`
