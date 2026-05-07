"""Tests for BranchMap CLI - classification, warnings, and integration smoke."""

import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import branch_map


class TestClassifyBranch(unittest.TestCase):
    def test_feature_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/feature/repo-orchestration/branch-map-sprint"
        )
        self.assertEqual(prefix, "feature")
        self.assertEqual(initiative, "repo-orchestration")
        self.assertEqual(slug, "branch-map-sprint")

    def test_validation_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "validation/repo-orchestration/branch-map-sprint"
        )
        self.assertEqual(prefix, "validation")
        self.assertEqual(initiative, "repo-orchestration")
        self.assertEqual(slug, "branch-map-sprint")

    def test_docs_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/docs/expert-briefs/initiative-structure"
        )
        self.assertEqual(prefix, "docs")
        self.assertEqual(initiative, "expert-briefs")
        self.assertEqual(slug, "initiative-structure")

    def test_fix_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/fix/repo-orchestration/typo"
        )
        self.assertEqual(prefix, "fix")
        self.assertEqual(initiative, "repo-orchestration")
        self.assertEqual(slug, "typo")

    def test_wip_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/wip/acer-hl/scratch"
        )
        self.assertEqual(prefix, "wip")
        self.assertEqual(initiative, "acer-hl")
        self.assertEqual(slug, "scratch")

    def test_discussion_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "discussion/architecture/backend-split"
        )
        self.assertEqual(prefix, "discussion")
        self.assertEqual(initiative, "architecture")
        self.assertEqual(slug, "backend-split")

    def test_main_is_not_classified(self):
        prefix, initiative, slug = branch_map.classify_branch("origin/main")
        self.assertIsNone(prefix)
        self.assertIsNone(initiative)
        self.assertIsNone(slug)

    def test_staging_is_not_classified(self):
        prefix, initiative, slug = branch_map.classify_branch("origin/staging")
        self.assertIsNone(prefix)
        self.assertIsNone(initiative)

    def test_unknown_prefix(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/experiment/something/cool"
        )
        self.assertIsNone(prefix)
        self.assertIsNone(initiative)
        self.assertIsNone(slug)

    def test_local_branch(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "feature/iphone-to-mac-brain/mlx-chat"
        )
        self.assertEqual(prefix, "feature")
        self.assertEqual(initiative, "iphone-to-mac-brain")
        self.assertEqual(slug, "mlx-chat")

    def test_simple_prefix_two_level(self):
        prefix, initiative, slug = branch_map.classify_branch(
            "origin/docs/README-update"
        )
        self.assertEqual(prefix, "docs")
        self.assertIsNone(initiative)
        self.assertEqual(slug, "README-update")

    def test_gh_pages_not_classified(self):
        prefix, initiative, slug = branch_map.classify_branch("origin/gh-pages")
        self.assertIsNone(prefix)


class TestDetectCrossRepoVocab(unittest.TestCase):
    def test_office_clerk_in_ihomenerd(self):
        warnings = branch_map.detect_cross_repo_vocab(
            "feature/repo-bootstrap/office-clerk-bootstrap",
            "iHomeNerd",
        )
        self.assertTrue(any("office-clerk" in w for w in warnings))

    def test_no_warning_for_same_repo(self):
        warnings = branch_map.detect_cross_repo_vocab(
            "feature/iphone-to-mac-brain/mlx-chat",
            "iHomeNerd",
        )
        self.assertEqual(len(warnings), 0)

    def test_pronunco_in_ihomenerd(self):
        warnings = branch_map.detect_cross_repo_vocab(
            "feature/pronunco/namespace-adoption",
            "iHomeNerd",
        )
        self.assertTrue(any("pronunco" in w.lower() for w in warnings))


class TestComputeStatus(unittest.TestCase):
    def test_merged(self):
        bi = branch_map.BranchInfo(
            full_name="origin/main",
            short_name="main",
            is_remote=True,
            tip_sha="abc1234",
            tip_date="2026-01-01",
            merged=True,
        )
        self.assertEqual(branch_map.compute_status(bi), "merged")

    def test_diverged(self):
        bi = branch_map.BranchInfo(
            full_name="origin/feature/x/y",
            short_name="feature/x/y",
            is_remote=True,
            tip_sha="abc1234",
            tip_date="2026-01-01",
            ahead=5,
            behind=3,
        )
        self.assertEqual(branch_map.compute_status(bi), "diverged")

    def test_ahead(self):
        bi = branch_map.BranchInfo(
            full_name="origin/feature/x/y",
            short_name="feature/x/y",
            is_remote=True,
            tip_sha="abc1234",
            tip_date="2026-01-01",
            ahead=5,
        )
        self.assertEqual(branch_map.compute_status(bi), "ahead")

    def test_behind(self):
        bi = branch_map.BranchInfo(
            full_name="origin/feature/x/y",
            short_name="feature/x/y",
            is_remote=True,
            tip_sha="abc1234",
            tip_date="2026-01-01",
            behind=3,
        )
        self.assertEqual(branch_map.compute_status(bi), "behind")

    def test_even(self):
        bi = branch_map.BranchInfo(
            full_name="origin/feature/x/y",
            short_name="feature/x/y",
            is_remote=True,
            tip_sha="abc1234",
            tip_date="2026-01-01",
        )
        self.assertEqual(branch_map.compute_status(bi), "even")


class TestFormatJson(unittest.TestCase):
    def test_json_output_structure(self):
        branches = [
            branch_map.BranchInfo(
                full_name="origin/feature/x/y",
                short_name="feature/x/y",
                is_remote=True,
                tip_sha="abc1234",
                tip_date="2026-01-01",
                prefix="feature",
                initiative="x",
                slug="y",
                ahead=5,
                behind=0,
                merge_base_sha="def5678",
                merge_base_date="2026-01-01",
                merged=False,
                status="ahead",
                warnings=["test warning"],
            )
        ]
        output = branch_map.format_json_output(branches, "origin/main", "/tmp/test")
        data = json.loads(output)
        self.assertEqual(data["repository"], "/tmp/test")
        self.assertEqual(data["base"], "origin/main")
        self.assertEqual(data["branch_count"], 1)
        self.assertEqual(len(data["branches"]), 1)
        self.assertEqual(data["branches"][0]["full_name"], "origin/feature/x/y")
        self.assertEqual(data["branches"][0]["status"], "ahead")
        self.assertIn("test warning", data["branches"][0]["warnings"])


class TestFormatText(unittest.TestCase):
    def test_text_output_contains_info(self):
        branches = [
            branch_map.BranchInfo(
                full_name="origin/feature/x/y",
                short_name="feature/x/y",
                is_remote=True,
                tip_sha="abc1234",
                tip_date="2026-01-01",
                prefix="feature",
                initiative="x",
                slug="y",
                ahead=5,
                behind=0,
                merge_base_sha="def5678",
                merge_base_date="2026-01-01",
                merged=False,
                status="ahead",
                warnings=["test warning"],
            )
        ]
        output = branch_map.format_text(branches, "origin/main", "/tmp/test")
        self.assertIn("BranchMap Report", output)
        self.assertIn("feature/x/y", output)
        self.assertIn("[feature]", output)
        self.assertIn("+5", output)
        self.assertIn("mb:def5678", output)
        self.assertIn("WARNING: test warning", output)
        self.assertIn("Summary:", output)


class TestIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.mkdtemp(prefix="branchmap_test_")
        cls.repo_path = os.path.join(cls.tmpdir, "testrepo")

        def git(*args):
            subprocess.run(
                ["git"] + list(args),
                cwd=cls.repo_path,
                capture_output=True,
                text=True,
                check=True,
            )

        os.makedirs(cls.repo_path)
        git("init", "-b", "main")
        git("config", "user.email", "test@test.com")
        git("config", "user.name", "Test User")

        with open(os.path.join(cls.repo_path, "README.md"), "w") as f:
            f.write("# Test Repo")
        git("add", "README.md")
        git("commit", "-m", "initial commit")

        git("checkout", "-b", "feature/init-a/sprint-one")
        with open(os.path.join(cls.repo_path, "a.txt"), "w") as f:
            f.write("a")
        git("add", "a.txt")
        git("commit", "-m", "a")
        git("checkout", "main")

        git("checkout", "-b", "validation/init-a/sprint-one")
        with open(os.path.join(cls.repo_path, "v.txt"), "w") as f:
            f.write("v")
        git("add", "v.txt")
        git("commit", "-m", "v")
        git("checkout", "main")

        git("checkout", "-b", "feature/init-b/sprint-two")
        with open(os.path.join(cls.repo_path, "b.txt"), "w") as f:
            f.write("b")
        git("add", "b.txt")
        git("commit", "-m", "b")
        git("checkout", "main")

        git("checkout", "-b", "feature/init-b/office-clerk-bootstrap")
        with open(os.path.join(cls.repo_path, "c.txt"), "w") as f:
            f.write("c")
        git("add", "c.txt")
        git("commit", "-m", "c")
        git("checkout", "main")

        git("checkout", "-b", "wip/acer-hl/scratch")
        with open(os.path.join(cls.repo_path, "d.txt"), "w") as f:
            f.write("d")
        git("add", "d.txt")
        git("commit", "-m", "d")
        git("checkout", "main")

        git("checkout", "-b", "experiment/something/weird")
        with open(os.path.join(cls.repo_path, "e.txt"), "w") as f:
            f.write("e")
        git("add", "e.txt")
        git("commit", "-m", "e")
        git("checkout", "main")

    @classmethod
    def tearDownClass(cls):
        import shutil
        shutil.rmtree(cls.tmpdir, ignore_errors=True)

    def test_cli_text_output(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        output = result.stdout
        self.assertIn("BranchMap Report", output)
        self.assertIn("feature/init-a/sprint-one", output)
        self.assertIn("validation/init-a/sprint-one", output)
        self.assertIn("feature/init-b/sprint-two", output)
        self.assertIn("feature/init-b/office-clerk-bootstrap", output)
        self.assertIn("wip/acer-hl/scratch", output)
        self.assertIn("experiment/something/weird", output)

    def test_cli_json_output(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
                "--format", "json",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0)
        data = json.loads(result.stdout)
        self.assertIn("branches", data)
        names = [b["short_name"] for b in data["branches"]]
        self.assertIn("feature/init-a/sprint-one", names)
        self.assertIn("validation/init-a/sprint-one", names)

    def test_cli_warnings_cross_repo(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertIn("office-clerk", result.stdout)

    def test_cli_warnings_unknown_prefix(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertIn("experiment/something/weird", result.stdout)

    def test_cli_feature_without_validation_warning(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertIn("feature/init-b/sprint-two", result.stdout)

    def test_read_only_does_not_modify_branches(self):
        before = subprocess.run(
            ["git", "for-each-ref", "refs/heads", "--format=%(refname:short) %(objectname:short)"],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
        )
        before_lines = sorted(before.stdout.strip().split("\n"))

        subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "main",
                "--format", "json",
            ],
            capture_output=True,
            text=True,
        )

        after = subprocess.run(
            ["git", "for-each-ref", "refs/heads", "--format=%(refname:short) %(objectname:short)"],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
        )
        after_lines = sorted(after.stdout.strip().split("\n"))
        self.assertEqual(before_lines, after_lines)

    def test_cli_nonexistent_repo(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", "/nonexistent/path",
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)

    def test_cli_nonexistent_base(self):
        result = subprocess.run(
            [
                sys.executable,
                os.path.join(
                    os.path.dirname(__file__), "..", "branch_map.py"
                ),
                "--repo", self.repo_path,
                "--base", "origin/nonexistent",
            ],
            capture_output=True,
            text=True,
        )
        self.assertNotEqual(result.returncode, 0)

    def test_cli_worktree_support(self):
        subprocess.run(
            ["git", "checkout", "feature/init-a/sprint-one"],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=True,
        )

        wt_path = os.path.join(self.tmpdir, "worktree")
        subprocess.run(
            ["git", "worktree", "add", wt_path, "main"],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=True,
        )
        self.assertTrue(os.path.isfile(os.path.join(wt_path, ".git")),
                        ".git should be a file in a worktree")

        result = subprocess.run(
            [
                sys.executable,
                os.path.join(os.path.dirname(__file__), "..", "branch_map.py"),
                "--repo", wt_path,
                "--base", "main",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0,
                         f"CLI should succeed in a git worktree; stderr: {result.stderr}")
        self.assertIn("BranchMap Report", result.stdout)

        subprocess.run(
            ["git", "worktree", "remove", wt_path],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=True,
        )

        subprocess.run(
            ["git", "checkout", "main"],
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            check=True,
        )


if __name__ == "__main__":
    unittest.main()
