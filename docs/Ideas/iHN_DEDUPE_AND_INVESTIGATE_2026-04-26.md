# Idea: iHN duplicate detection across nodes

**Status:** captured idea, not scheduled
**Date:** 2026-04-26
**Source:** practical disk-audit moment on `mac-mini-m1.local`

---

## The seed

While auditing disk on the Mac mini, the user pointed out that
`/Users/alex/ToBeProcessed/` (10 GB across `CacheClip`, `Posts by story`,
`Images`, `Video`, `Audio`) needs analysis before deletion — and that
this is exactly the kind of job iHN should be able to do natively as a
duplicate / similarity scan across multiple locations on multiple nodes.

## Why it fits iHN

iHN already has the right primitives in place:

- **Local Radar / Investigate** — exists, scans LAN devices and gathers
  metadata
- **Multi-node control plane** — gateway can reach managed nodes
- **Capability routing** — work can land on whichever node has spare
  cycles
- **Trust boundary** — scanning never leaves the household

A "is this 4 GB folder of clips on the Mac mini already a duplicate of
something on the MSI rig or the OMV NAS?" question is a much more
honest pitch for "what is your home AI for" than another chat demo.

## What it would do

1. **Across-node hash sweep.** Walk a chosen path on each node, hash by
   (name, size, content sample, full hash for confirmation), build a
   household-wide index.
2. **Similarity, not just identity.** A near-match for images
   (perceptual hash) or videos (frame-sample hash) is more useful than
   exact duplicates.
3. **Group by story.** Folder names like `Posts by story` suggest
   project/story groupings. Detection should respect those clusters
   when reporting "you have 3 versions of this story across 2 nodes."
4. **Show the user, never auto-delete.** Output is an inspectable
   report with one-click "remove from this node, keep on that one"
   actions. iHN never touches user files without confirmation.
5. **Run on the worker tier appropriate for the volume.** Hashing
   GB-scale folders should land on the GPU/CPU worker, not the gateway.

## Test data already on hand

- `mac-mini-m1.local:/Users/alex/ToBeProcessed/` (~10 GB, varied media)
- almost certainly more on `msi-raider-linux` and on the OMV NAS
  (`omv6-opi5`)

That's a real cross-node job with mixed media and known-uncertain
duplication state — better than synthetic test data.

## Why this is interesting product-side

Aligns with the recurring iHN principle: **the AI's value is what your
household does together, not what one model knows.** A dedupe-and-
organize agent that quietly runs across your nodes is a much more
demonstrable "real job" than another chat box.

Also fits the spare-hardware ladder story — the OMV box doesn't run
LLMs but is a perfect node for running a hash sweep.

## Not a commitment

Logged here so it doesn't get lost. Not on the roadmap until trust /
host-assist / mobile foundations are stable per
`docs/CURRENT_STATE_AND_NEXT_MOVES_2026-04-24.md`.
