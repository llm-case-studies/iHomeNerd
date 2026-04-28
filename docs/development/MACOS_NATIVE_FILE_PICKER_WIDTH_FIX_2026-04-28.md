# macOS Native File Picker Huge Width Fix

Date: 2026-04-28

## Summary

On `alex@mac-mini-m1`, native macOS file/folder pickers were opening at an unusably wide size, commonly around `2680px` wide on a `1920x1080` desktop. The picker width could not be reduced by dragging or Accessibility resizing, although height and position sometimes changed.

Affected apps included Codex, OpenCode, Xcode, VSCode when native dialogs were enabled, and earlier DaVinci Resolve/TextEdit-style open/save panels.

The root cause was not an individual app. A shared Finder/FinderKit preference had an invalidly large sidebar width:

```sh
defaults read com.apple.finder FK_SidebarWidth2
# 1994
```

Normal nearby sidebar widths on the same machine were about `196`, `225`, and `285`. A `1994px` sidebar plus the file list and action controls explains the observed `2680px` native picker width.

## Root Cause

AppKit open/save panels reuse system FinderKit-style layout state. The oversized `com.apple.finder` key `FK_SidebarWidth2 = 1994` effectively became a shared minimum width constraint for native file panels.

Once a native picker opened with that shared bad sidebar width, each app could then save the resulting oversized panel frame to its own preferences:

```text
com.openai.codex      NSNavPanelExpandedSizeForOpenMode = "{2680, 448}"
ai.opencode.desktop  NSNavPanelExpandedSizeForOpenMode = "{2680, 465}"
com.apple.dt.Xcode   NSNavPanelExpandedSizeForOpenMode = "{2680, 448}"
```

Those per-app `NSNavPanelExpandedSizeForOpenMode` values were symptoms. Resetting them alone did not stick because the next native picker rebuilt itself from the shared oversized FinderKit sidebar width and re-saved the bad app-specific frame.

## Fix Applied

Reset the shared FinderKit sidebar width:

```sh
defaults write com.apple.finder FK_SidebarWidth2 -int 225
```

Reset apps that had already persisted the oversized open-panel frame:

```sh
defaults write com.openai.codex NSNavPanelExpandedSizeForOpenMode -string '{800, 448}'
defaults write ai.opencode.desktop NSNavPanelExpandedSizeForOpenMode -string '{800, 448}'
defaults write com.apple.dt.Xcode NSNavPanelExpandedSizeForOpenMode -string '{800, 448}'
```

Flush preference caching:

```sh
killall cfprefsd
```

Then fully quit and reopen the affected apps before testing.

## Verification

Confirm the shared sidebar width is sane:

```sh
defaults read com.apple.finder FK_SidebarWidth2
# 225
```

Confirm known affected app picker sizes were reset:

```sh
defaults find NSNavPanelExpandedSizeForOpenMode
```

Expected relevant values after the fix:

```text
com.openai.codex      NSNavPanelExpandedSizeForOpenMode = "{800, 448}"
ai.opencode.desktop  NSNavPanelExpandedSizeForOpenMode = "{800, 448}"
com.apple.dt.Xcode   NSNavPanelExpandedSizeForOpenMode = "{800, 448}"
```

User verification: after relaunching apps, native file/folder pickers opened at normal usable widths in Codex, OpenCode, Xcode, and other affected apps.

## Likely Cause

The exact originating event is not proven, but the most likely cause is that a native Finder-style file panel or Finder window accidentally persisted an enormous sidebar width into `FK_SidebarWidth2`. This could have happened through:

- dragging a sidebar divider in a native file/open panel or Finder-related view
- a macOS migration or display-scaling/layout bug
- an app using native AppKit panels, such as DaVinci Resolve, causing FinderKit to save a bad shared width

The first app where the issue was noticed was probably not the app that caused it. Any app using native `NSOpenPanel`/`NSSavePanel` could expose or re-save the bad layout once the shared FinderKit value existed.

## If It Reappears

Run:

```sh
defaults read com.apple.finder FK_SidebarWidth
defaults read com.apple.finder FK_SidebarWidth2
defaults find NSNavPanelExpandedSizeForOpenMode
```

If `FK_SidebarWidth2` is huge again, reset it first. Only then reset app-specific `NSNavPanelExpandedSizeForOpenMode` values that have already captured the oversized width.

Avoid deleting all Finder preferences unless the narrow fix fails; the targeted `FK_SidebarWidth2` reset preserves the rest of Finder's configuration.

