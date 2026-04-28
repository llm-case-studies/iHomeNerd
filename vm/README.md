# iHomeNerd Trial VM Scaffold

This is a developer scaffold for the VM-first trial path. It does not produce a polished public download yet.

The VM boots an Ubuntu cloud image, installs Docker, downloads this repository, and starts the same Docker Compose stack used by the Docker path. That keeps VM work aligned with the already-tested runtime instead of creating a second installer.

## What This Builds

- `vm/out/ihomenerd-trial.qcow2` - a copy-on-write VM disk backed by an Ubuntu cloud image.
- `vm/out/ihomenerd-seed.iso` - cloud-init seed data that performs first-boot setup.

The VM exposes:

- `https://localhost:17777` - Command Center when using the sample QEMU NAT forwarding command.
- `http://localhost:17778/setup` - certificate and extension setup helper.

## Prerequisites

On an Ubuntu/Debian developer machine:

```bash
sudo apt-get install qemu-utils cloud-image-utils curl
```

Optional, if you want to boot directly with QEMU:

```bash
sudo apt-get install qemu-system-x86
```

## Build The Local VM Seed

```bash
./vm/build-qcow2.sh
```

To test a branch other than `main`:

```bash
IHN_REPO_REF=my-branch ./vm/build-qcow2.sh
```

## Boot With QEMU

The build script prints a QEMU command. It uses NAT port forwards so it does not expose anything to the LAN by default.

For testing from phones or other machines on the network, use bridged networking in your VM app instead of NAT. That is more realistic for iHomeNerd discovery, but less isolated.

## First-Boot Behavior

Cloud-init runs `/usr/local/sbin/ihomenerd-firstboot.sh`.

That script:

- installs Docker using Docker's official convenience script
- downloads `llm-case-studies/iHomeNerd` as a branch archive
- runs `docker compose up -d --build`
- leaves model downloads for the user or future guided UI, so the first VM boot is not blocked on multi-GB model pulls

## Why This Uses Docker Inside The VM

For the trial VM, Docker is an implementation detail. The user experience should be "boot VM, open local URL", not "learn Docker." Reusing the Docker path gives us one runtime to harden while VM, spare-PC, and future live-image paths mature.

## Not Yet Done

- Convert to `.ova`/`.vdi` for VirtualBox users.
- Build an Apple Silicon image path for UTM.
- Add signed published artifacts and checksums.
- Add first-boot UI progress/status instead of relying on cloud-init logs.
- Add optional starter model prefetch with clear disk/time estimates.
