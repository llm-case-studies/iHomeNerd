# Example Sprint Pack: Android Normalize Pinyin Route

This is a small Android contract sprint pack.

Use it when you want one bounded evening sprint that:

1. closes a real runtime contract gap
2. stays out of broader UI/product redesign
3. can be smoke-tested quickly on the Android build host
4. leaves a clean validation request for `wip/testing`

## Sprint topic

`feature/android-normalize-pinyin-route`

Goal:

- expose `normalize_pinyin` as a real Android runtime HTTP route
- align the route surface with what `/health`, `/capabilities`, and `/v1/models`
  already advertise
- remove one obvious capability/route mismatch from the Android node

## Files in this pack

- `01-brief.md` — what the coding agent should do
- `02-result-template.md` — how the coding agent reports back
- `03-merge-note-template.md` — how the owner records promotion/hold

The validator request for this sprint lives in:

- `mobile/testing/requests/ANDROID_NORMALIZE_PINYIN_ROUTE_TEST_REQUEST_2026-05-03.md`
