#!/usr/bin/env python3
"""BranchMap - Read-only branch topology and governance CLI.

Reports branch relationships to a chosen base, grouping by initiative/prefix
and surfacing explainable warnings for suspicious branch patterns.

All Git operations are read-only. This tool never creates, switches, deletes,
renames, merges, rebases, or pushes branches.
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


KNOWN_PREFIXES = {"feature", "validation", "discussion", "docs", "fix", "wip"}

KNOWN_REPO_VOCAB = {
    "ihomenerd",
    "pronunco",
    "office-clerk",
    "office_clerk",
}

NON_INITIATIVE_BRANCHES = {"main", "master", "staging", "develop", "gh-pages"}

DIVERGED_COMMIT_THRESHOLD = 50
WIP_AGE_DAYS_THRESHOLD = 30
WIP_DIVERGED_THRESHOLD = 20


def run_git(args: list[str], cwd: str) -> str:
    result = subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def git_ref_exists(ref: str, cwd: str) -> bool:
    try:
        run_git(["rev-parse", "--verify", "-q", ref], cwd)
        return True
    except RuntimeError:
        return False


def is_git_repo(path: str) -> bool:
    try:
        run_git(["rev-parse", "--git-dir"], path)
        return True
    except RuntimeError:
        return False


@dataclass
class BranchInfo:
    full_name: str
    short_name: str
    is_remote: bool
    tip_sha: str
    tip_date: str
    prefix: Optional[str] = None
    initiative: Optional[str] = None
    slug: Optional[str] = None
    ahead: int = 0
    behind: int = 0
    merge_base_sha: str = ""
    merge_base_date: str = ""
    merged: bool = False
    status: str = "unknown"
    warnings: list[str] = field(default_factory=list)


def classify_branch(full_name: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    name = full_name
    if "/" in name and name.split("/")[0] in {"origin", "upstream"}:
        name = "/".join(name.split("/")[1:])

    for known in NON_INITIATIVE_BRANCHES:
        if name == known:
            return (None, None, None)

    parts = name.split("/")
    if len(parts) >= 2 and parts[0] in KNOWN_PREFIXES:
        prefix = parts[0]
        if len(parts) >= 3:
            initiative = parts[1]
            slug = "/".join(parts[2:])
            return (prefix, initiative, slug)
        else:
            return (prefix, None, "/".join(parts[1:]))

    if name.startswith("feature/") or name.startswith("validation/") or \
       name.startswith("docs/") or name.startswith("fix/") or \
       name.startswith("discussion/") or name.startswith("wip/"):
        for p in KNOWN_PREFIXES:
            if name.startswith(p + "/"):
                rest = name[len(p) + 1:]
                parts = rest.split("/")
                if len(parts) >= 2:
                    return (p, parts[0], "/".join(parts[1:]))
                return (p, None, rest)

    return (None, None, None)


def detect_cross_repo_vocab(branch_name: str, current_repo: str) -> list[str]:
    warnings = []
    name_lower = branch_name.lower().replace("_", "-")
    for vocab in KNOWN_REPO_VOCAB:
        if vocab.replace("_", "-") == current_repo.lower().replace("_", "-"):
            continue
        if vocab.replace("_", "-") in name_lower:
            warnings.append(
                f"branch name contains '{vocab}' vocabulary inside '{current_repo}' repo"
            )
    return warnings


def collect_branches(repo_path: str, base_ref: str) -> list[BranchInfo]:
    branches: list[BranchInfo] = []
    repo_abs = os.path.abspath(repo_path)

    current_repo_name = os.path.basename(repo_abs.rstrip("/"))

    output = run_git(
        [
            "for-each-ref",
            "refs/heads",
            "refs/remotes",
            "--format=%(refname:short)|%(objectname:short)|%(committerdate:unix)",
        ],
        repo_abs,
    )

    now = datetime.now()

    branch_list = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|")
        if len(parts) < 3:
            continue
        full_name = parts[0]
        if full_name in ("HEAD", "origin/HEAD"):
            continue
        tip_sha = parts[1]
        committer_ts = parts[2]
        try:
            tip_dt = datetime.fromtimestamp(int(committer_ts))
            tip_date = tip_dt.strftime("%Y-%m-%d")
        except (ValueError, OSError):
            tip_date = "unknown"

        is_remote = full_name.startswith("origin/") or full_name.startswith("upstream/")
        short_name = full_name
        if "/" in full_name and full_name.split("/")[0] in {"origin", "upstream"}:
            short_name = "/".join(full_name.split("/")[1:])

        branch_list.append((full_name, short_name, is_remote, tip_sha, tip_date, int(committer_ts) if committer_ts.isdigit() else 0))

    merged_branches: set[str] = set()
    unmerged_branches: set[str] = set()
    try:
        if git_ref_exists(base_ref, repo_abs):
            try:
                merged_out = run_git(["branch", "-r", "--merged", base_ref], repo_abs)
                for mline in merged_out.split("\n"):
                    mline = mline.strip().lstrip("*").strip()
                    if mline and mline in {f[0] for f in branch_list if f[2]}:
                        merged_branches.add(mline)
            except RuntimeError:
                pass

            try:
                unmerged_out = run_git(["branch", "-r", "--no-merged", base_ref], repo_abs)
                for mline in unmerged_out.split("\n"):
                    mline = mline.strip().lstrip("*").strip()
                    if mline and mline in {f[0] for f in branch_list if f[2]}:
                        unmerged_branches.add(mline)
            except RuntimeError:
                pass
        merged_branches.add(base_ref)
    except RuntimeError:
        base_name = base_ref.split("/", 1)[1] if "/" in base_ref else base_ref
        merged_branches.add(base_name)

    all_slugs: dict[str, list[BranchInfo]] = {}

    for full_name, short_name, is_remote, tip_sha, tip_date, committer_ts_int in branch_list:
        prefix, initiative, slug = classify_branch(full_name)

        bi = BranchInfo(
            full_name=full_name,
            short_name=short_name,
            is_remote=is_remote,
            tip_sha=tip_sha,
            tip_date=tip_date,
            prefix=prefix,
            initiative=initiative,
            slug=slug,
        )

        if initiative and slug:
            key = f"{initiative}/{slug}"
            all_slugs.setdefault(key, []).append(bi)

        try:
            if git_ref_exists(base_ref, repo_abs) and git_ref_exists(full_name, repo_abs):
                try:
                    mb = run_git(["merge-base", base_ref, full_name], repo_abs)
                    bi.merge_base_sha = mb[:7] if len(mb) >= 7 else mb

                    try:
                        mb_date_out = run_git(
                            ["log", "-1", "--format=%ct", mb],
                            repo_abs,
                        )
                        mb_dt = datetime.fromtimestamp(int(mb_date_out.strip()))
                        bi.merge_base_date = mb_dt.strftime("%Y-%m-%d")
                    except (ValueError, RuntimeError):
                        bi.merge_base_date = "unknown"

                    try:
                        ahead_str = run_git(
                            ["rev-list", "--count", f"{base_ref}..{full_name}"],
                            repo_abs,
                        )
                        bi.ahead = int(ahead_str.strip())
                    except (ValueError, RuntimeError):
                        bi.ahead = 0

                    try:
                        behind_str = run_git(
                            ["rev-list", "--count", f"{full_name}..{base_ref}"],
                            repo_abs,
                        )
                        bi.behind = int(behind_str.strip())
                    except (ValueError, RuntimeError):
                        bi.behind = 0
                except RuntimeError:
                    pass
        except RuntimeError:
            pass

        if full_name in merged_branches or short_name in merged_branches:
            bi.merged = True

        bi.status = compute_status(bi)

        branches.append(bi)

    known_branches = {b.short_name for b in branches}
    known_full = {b.full_name for b in branches}

    for bi in branches:
        warnings = bi.warnings

        if bi.prefix is None and bi.short_name not in NON_INITIATIVE_BRANCHES:
            if not any(kp in bi.short_name for kp in KNOWN_PREFIXES):
                warnings.append(
                    f"branch '{bi.short_name}' does not follow known naming prefixes "
                    f"({', '.join(sorted(KNOWN_PREFIXES))})"
                )

        if bi.prefix == "wip":
            tip_ts = committer_ts_int if committer_ts_int else 0
            age_days = (now - datetime.fromtimestamp(tip_ts)).days if tip_ts > 0 else 0
            if age_days > WIP_AGE_DAYS_THRESHOLD:
                warnings.append(
                    f"wip branch '{bi.short_name}' is long-running ({age_days} days since last commit)"
                )
            if bi.ahead + bi.behind > WIP_DIVERGED_THRESHOLD:
                warnings.append(
                    f"wip branch '{bi.short_name}' is substantially diverged "
                    f"(ahead {bi.ahead}, behind {bi.behind})"
                )

        if bi.behind > DIVERGED_COMMIT_THRESHOLD:
            if bi.short_name == "main" and not bi.is_remote:
                bi.warnings.append(
                    f"[INFO] local 'main' is behind '{base_ref}' by {bi.behind} commits "
                    f"(expected in multi-host workflows)"
                )
            else:
                warnings.append(
                    f"branch '{bi.short_name}' is very far behind base "
                    f"({bi.behind} commits)"
                )

        if bi.ahead > 0 and bi.behind > 0 and bi.status != "merged":
            if not (bi.initiative and bi.slug):
                warnings.append(
                    f"branch '{bi.short_name}' is ahead {bi.ahead} and behind {bi.behind} "
                    f"and not clearly grouped by initiative"
                )

        cross_warnings = detect_cross_repo_vocab(bi.short_name, current_repo_name)
        warnings.extend(cross_warnings)

        if bi.prefix == "validation" and bi.initiative and bi.slug:
            feat_name = f"feature/{bi.initiative}/{bi.slug}"
            if feat_name not in known_branches and f"origin/{feat_name}" not in known_full:
                warnings.append(
                    f"validation branch '{bi.short_name}' exists without corresponding "
                    f"feature branch '{feat_name}'"
                )

        if bi.prefix == "feature" and bi.initiative and bi.slug:
            val_name = f"validation/{bi.initiative}/{bi.slug}"
            if val_name not in known_branches and f"origin/{val_name}" not in known_full:
                bi.warnings.append(
                    f"[INFO] feature branch '{bi.short_name}' has no nearby validation "
                    f"evidence ('{val_name}' not found)"
                )

    return branches


def compute_status(bi: BranchInfo) -> str:
    if bi.merged:
        return "merged"
    if bi.ahead > 0 and bi.behind > 0:
        return "diverged"
    if bi.ahead > 0 and bi.behind == 0:
        return "ahead"
    if bi.ahead == 0 and bi.behind > 0:
        return "behind"
    if bi.ahead == 0 and bi.behind == 0:
        return "even"
    return "unknown"


def format_text(branches: list[BranchInfo], base_ref: str, repo_path: str) -> str:
    lines: list[str] = []
    lines.append(f"BranchMap Report")
    lines.append(f"Repository: {os.path.abspath(repo_path)}")
    lines.append(f"Base: {base_ref}")
    lines.append(f"Branches: {len(branches)}")
    lines.append("=" * 70)

    group_order = ["feature", "validation", "docs", "fix", "discussion", "wip", None]
    grouped: dict[str, list[BranchInfo]] = {}
    for bi in branches:
        key = bi.initiative if bi.initiative else "other"
        grouped.setdefault(key, []).append(bi)

    for group_name, group_branches in sorted(grouped.items()):
        if group_name == "other":
            header = "Other / Ungrouped Branches"
        else:
            header = f"Initiative: {group_name}"
        lines.append(f"\n  {header}")
        lines.append("  " + "-" * 60)

        sorted_branches = sorted(group_branches, key=lambda b: (
            group_order.index(b.prefix) if b.prefix in group_order else 99,
            b.short_name,
        ))

        for bi in sorted_branches:
            prefix_str = f"[{bi.prefix}]" if bi.prefix else "[none]"
            meta_parts = [prefix_str]
            if bi.ahead:
                meta_parts.append(f"+{bi.ahead}")
            if bi.behind:
                meta_parts.append(f"-{bi.behind}")
            meta_parts.append(bi.status)

            if bi.merge_base_sha:
                meta_parts.append(f"mb:{bi.merge_base_sha}")

            if bi.merge_base_date:
                meta_parts.append(f"mb-date:{bi.merge_base_date}")

            lines.append(f"\n    {bi.short_name}  {' '.join(meta_parts)}")
            lines.append(f"      tip: {bi.tip_sha} ({bi.tip_date})")

            if bi.warnings:
                for w in bi.warnings:
                    lines.append(f"      WARNING: {w}")

    lines.append(f"\n{'=' * 70}")
    warning_count = sum(1 for b in branches for w in b.warnings if not w.startswith("[INFO]"))
    info_count = sum(1 for b in branches for w in b.warnings if w.startswith("[INFO]"))
    lines.append(f"Summary: {len(branches)} branches, {warning_count} warning(s), {info_count} info note(s)")
    return "\n".join(lines)


def format_json_output(branches: list[BranchInfo], base_ref: str, repo_path: str) -> str:
    data = {
        "repository": os.path.abspath(repo_path),
        "base": base_ref,
        "branch_count": len(branches),
        "branches": [],
    }
    for bi in branches:
        entry = {
            "full_name": bi.full_name,
            "short_name": bi.short_name,
            "is_remote": bi.is_remote,
            "tip_sha": bi.tip_sha,
            "tip_date": bi.tip_date,
            "prefix": bi.prefix,
            "initiative": bi.initiative,
            "slug": bi.slug,
            "ahead": bi.ahead,
            "behind": bi.behind,
            "merge_base_sha": bi.merge_base_sha,
            "merge_base_date": bi.merge_base_date,
            "merged": bi.merged,
            "status": bi.status,
            "warnings": bi.warnings,
        }
        data["branches"].append(entry)
    return json.dumps(data, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BranchMap - Read-only branch topology and governance CLI"
    )
    parser.add_argument(
        "--repo",
        default=".",
        help="Path to the git repository (default: .)",
    )
    parser.add_argument(
        "--base",
        default="origin/main",
        help="Base ref to compare branches against (default: origin/main)",
    )
    parser.add_argument(
        "--format",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Write output to file instead of stdout",
    )
    args = parser.parse_args()

    repo_path = os.path.abspath(args.repo)
    if not is_git_repo(repo_path):
        print(f"Error: '{repo_path}' is not a git repository", file=sys.stderr)
        sys.exit(1)

    if not git_ref_exists(args.base, repo_path):
        print(f"Error: base ref '{args.base}' not found in repository", file=sys.stderr)
        sys.exit(1)

    try:
        branches = collect_branches(repo_path, args.base)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    output: str
    if args.format == "json":
        output = format_json_output(branches, args.base, repo_path)
    else:
        output = format_text(branches, args.base, repo_path)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
            f.write("\n")
    else:
        print(output)


if __name__ == "__main__":
    main()
