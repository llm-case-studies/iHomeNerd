#  iHN Home (iOS) — build orchestration
#
#  This repo lives on Linux. Builds happen on a Mac (mac-mini-m1.local by
#  default). All `remote-*` targets ssh into the Mac, sync the project, run
#  XcodeGen, and invoke xcodebuild.
#
#  Usage from the Linux side:
#    make remote-bootstrap   # one-time: install xcodegen on the Mac
#    make remote-project     # sync + generate IhnHome.xcodeproj on the Mac
#    make remote-build       # build for iPhone 15 simulator
#    make remote-list-sims   # show simulator destinations available
#    make remote-clean       # nuke build/ and the generated .xcodeproj on the Mac
#
#  Override the build host:
#    make remote-build MAC_HOST=192.168.0.42
#
#  Local-only targets (only useful if you have XcodeGen on Linux too):
#    make project            # generate IhnHome.xcodeproj here
#    make clean              # remove generated .xcodeproj here

MAC_HOST     ?= mac-mini-m1.local
MAC_USER     ?= alex
MAC_PATH     ?= ihn-home-ios
SCHEME       ?= IhnHome
SIM_DEVICE   ?= iPhone 17 Pro

# Device build target: identifier from `xcrun devicectl list devices`.
# Default is the iPhone 12 Pro Max in the test fleet. Override with:
#   make remote-device-build DEVICE_ID=<udid>
DEVICE_ID    ?= 00008101-000D34A81A11001E
DEVICE_NAME  ?= Alex's iPhone

# Personal Team ID for `alex@mac-mini-m1.local`. Alex Sudakov (Personal Team).
# Discovered via `defaults read com.apple.dt.Xcode | grep teamID`.
# Override if signing under a different Apple ID:
#   make remote-device-build DEVELOPMENT_TEAM=XXXXXXXXXX
DEVELOPMENT_TEAM ?= Y4WA2P4SQK

REMOTE = $(MAC_USER)@$(MAC_HOST)

# Non-interactive ssh sessions do not source ~/.zprofile, so brew-installed
# tools (xcodegen) need their bin dir injected explicitly. Apple Silicon
# brew lives at /opt/homebrew; Intel brew lives at /usr/local. Both are
# safe to prepend.
#
# DEVELOPER_DIR pins Xcode regardless of what xcode-select currently points
# at — Homebrew installs sometimes flip xcode-select back to CommandLineTools.
REMOTE_PATH := export PATH=/opt/homebrew/bin:/usr/local/bin:$$PATH; export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer;

RSYNC_FLAGS := -az --delete \
	--exclude '.git/' \
	--exclude 'IhnHome.xcodeproj/' \
	--exclude 'build/' \
	--exclude 'DerivedData/' \
	--exclude '.DS_Store'

BUNDLE_ID    ?= com.ihomenerd.home
APP_PATH     := build/Build/Products/Debug-iphonesimulator/IhnHome.app
SCREENSHOT   ?= build/screenshot.png

.PHONY: project clean remote-bootstrap remote-sync remote-project remote-build remote-run remote-screenshot remote-list-sims remote-clean remote-shell

project:
	xcodegen generate

clean:
	rm -rf IhnHome.xcodeproj build/ DerivedData/

remote-bootstrap:
	@echo ">> Installing xcodegen on $(MAC_HOST) (requires Homebrew)"
	ssh $(REMOTE) '$(REMOTE_PATH) command -v brew >/dev/null || { echo "ERROR: Homebrew not installed on $(MAC_HOST). Install from https://brew.sh first."; exit 1; }'
	ssh $(REMOTE) '$(REMOTE_PATH) command -v xcodegen >/dev/null || brew install xcodegen'
	ssh $(REMOTE) '$(REMOTE_PATH) xcodegen --version'

remote-sync:
	@echo ">> Syncing project to $(REMOTE):$(MAC_PATH)"
	ssh $(REMOTE) 'mkdir -p $(MAC_PATH)'
	rsync $(RSYNC_FLAGS) ./ $(REMOTE):$(MAC_PATH)/

remote-project: remote-sync
	@echo ">> Generating IhnHome.xcodeproj on $(MAC_HOST)"
	ssh $(REMOTE) '$(REMOTE_PATH) cd $(MAC_PATH) && xcodegen generate'

remote-build: remote-project
	@echo ">> Booting simulator $(SIM_DEVICE) (Xcode 26.3 won't find unbooted sims)"
	-ssh $(REMOTE) '$(REMOTE_PATH) xcrun simctl boot "$(SIM_DEVICE)" 2>&1 | grep -v "Booted" || true'
	@echo ">> Building $(SCHEME) for $(SIM_DEVICE)"
	ssh $(REMOTE) "$(REMOTE_PATH) cd $(MAC_PATH) && xcodebuild -project IhnHome.xcodeproj -scheme $(SCHEME) -destination 'platform=iOS Simulator,name=$(SIM_DEVICE)' -configuration Debug -derivedDataPath ./build build CODE_SIGNING_ALLOWED=NO"

remote-run: remote-build
	@echo ">> Installing IhnHome.app on $(SIM_DEVICE)"
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun simctl install booted $(MAC_PATH)/$(APP_PATH)'
	@echo ">> Launching $(BUNDLE_ID)"
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun simctl launch booted $(BUNDLE_ID)'

remote-screenshot: remote-run
	@echo ">> Snapping screenshot of $(SIM_DEVICE)"
	@sleep 2
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun simctl io booted screenshot $(MAC_PATH)/$(SCREENSHOT)'
	mkdir -p build
	scp $(REMOTE):$(MAC_PATH)/$(SCREENSHOT) ./$(SCREENSHOT)
	@echo ">> Saved to ./$(SCREENSHOT)"

remote-device-list:
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun devicectl list devices'

remote-device-build: remote-project
	@if [ -z "$$IHN_KEYCHAIN_PW" ]; then \
		echo "ERROR: device builds need IHN_KEYCHAIN_PW to unlock the Mac's login keychain."; \
		echo "       Run once per shell session:"; \
		echo "         read -rs IHN_KEYCHAIN_PW; export IHN_KEYCHAIN_PW"; \
		exit 1; \
	fi
	@echo ">> Building $(SCHEME) for device $(DEVICE_NAME) ($(DEVICE_ID))"
	ssh $(REMOTE) "$(REMOTE_PATH) security unlock-keychain -p '$$IHN_KEYCHAIN_PW' ~/Library/Keychains/login.keychain-db && cd $(MAC_PATH) && xcodebuild -project IhnHome.xcodeproj -scheme $(SCHEME) -destination 'platform=iOS,id=$(DEVICE_ID)' -configuration Debug -derivedDataPath ./build -allowProvisioningUpdates $(if $(DEVELOPMENT_TEAM),DEVELOPMENT_TEAM=$(DEVELOPMENT_TEAM),) build"

remote-device-install: remote-device-build
	@echo ">> Installing IhnHome.app on $(DEVICE_NAME)"
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun devicectl device install app --device $(DEVICE_ID) $(MAC_PATH)/build/Build/Products/Debug-iphoneos/IhnHome.app'

remote-device-launch: remote-device-install
	@echo ">> Launching $(BUNDLE_ID) on $(DEVICE_NAME)"
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun devicectl device process launch --device $(DEVICE_ID) $(BUNDLE_ID)'

remote-list-sims:
	ssh $(REMOTE) '$(REMOTE_PATH) xcrun simctl list devices available | grep -E "iPhone|iPad"'

remote-clean:
	ssh $(REMOTE) 'cd $(MAC_PATH) 2>/dev/null && rm -rf IhnHome.xcodeproj build/ DerivedData/ || true'

remote-shell:
	ssh $(REMOTE) -t 'cd $(MAC_PATH) && exec $$SHELL'
