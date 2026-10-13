#!/usr/bin/env node
/**
 * scripts/submit-marketplace-update.mjs
 * Submits a verification/update issue to omacom/omarchy-plugin-marketplace
 * when all CI tests have passed on master.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");

const MARKETPLACE_OWNER = "omacom";
const MARKETPLACE_REPO = "omarchy-plugin-marketplace";

function getCommitSha() {
  if (process.env.COMMIT_SHA && /^[a-f0-9]{40}$/i.test(process.env.COMMIT_SHA)) {
    return process.env.COMMIT_SHA.toLowerCase();
  }
  try {
    const sha = execSync("git rev-parse HEAD", { cwd: ROOT_DIR, encoding: "utf8" }).trim();
    if (/^[a-f0-9]{40}$/i.test(sha)) return sha.toLowerCase();
  } catch {
    // fallback if git command fails
  }
  throw new Error("Unable to determine valid 40-character commit SHA.");
}

function getPluginDetails() {
  const manifestPath = resolve(ROOT_DIR, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!manifest.id) {
    throw new Error("Missing 'id' field in manifest.json");
  }
  return {
    pluginId: manifest.id,
    repoUrl: "https://github.com/Codesmith28/omalt-tab",
  };
}

function buildIssuePayload(pluginId, repoUrl, commitSha) {
  const title = `[Verify]: Update ${pluginId} to ${commitSha.slice(0, 7)}`;
  const body = [
    "### Verification action",
    "",
    "Verify and publish a newer upstream commit",
    "",
    "### Plugin ID",
    "",
    pluginId,
    "",
    "### Repository URL",
    "",
    repoUrl,
    "",
    "### Target commit",
    "",
    commitSha,
    "",
    "### Verification acknowledgment",
    "",
    "- [x] I understand that only the exact target commit can become a verified marketplace snapshot and that verification is not a security audit.",
    "",
    "### Standard installation acknowledgment",
    "",
    "- [x] I confirm that this listed root plugin supports the standard Omarchy installation path and does not require manual setup.",
    "",
  ].join("\n");

  return { title, body };
}

async function checkExistingIssue(token, commitSha) {
  try {
    const url = `https://api.github.com/repos/${MARKETPLACE_OWNER}/${MARKETPLACE_REPO}/issues?state=all&per_page=30&creator=Codesmith28`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "omalt-tab-marketplace-ci",
      },
    });
    if (res.ok) {
      const issues = await res.json();
      if (Array.isArray(issues)) {
        return issues.find((issue) => issue.body && issue.body.includes(commitSha));
      }
    }
  } catch (err) {
    console.warn("Notice: Could not check for existing issues:", err.message);
  }
  return null;
}

async function submitIssue(title, body, token) {
  const url = `https://api.github.com/repos/${MARKETPLACE_OWNER}/${MARKETPLACE_REPO}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "omalt-tab-marketplace-ci",
    },
    body: JSON.stringify({ title, body }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}): ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const commitSha = getCommitSha();
  const { pluginId, repoUrl } = getPluginDetails();
  const { title, body } = buildIssuePayload(pluginId, repoUrl, commitSha);

  console.log("==================================================");
  console.log("Omarchy Marketplace Update Submission");
  console.log("==================================================");
  console.log(`Plugin ID:    ${pluginId}`);
  console.log(`Repository:   ${repoUrl}`);
  console.log(`Commit:       ${commitSha}`);
  console.log(`Issue Title:  ${title}`);
  console.log("--------------------------------------------------");

  if (isDryRun) {
    console.log("Generated Issue Body:\n");
    console.log(body);
    console.log("--------------------------------------------------");
    console.log("✓ Dry-run completed successfully. Issue payload is valid.");
    return;
  }

  const token =
    process.env.MARKETPLACE_TOKEN ||
    process.env.GH_PAT ||
    process.env.MARKETPLACE_SUBMISSION_TOKEN ||
    process.env.PAT;

  if (!token) {
    console.error("❌ Error: Missing authentication token.");
    console.error("");
    console.error("To submit an issue to omacom/omarchy-plugin-marketplace, please configure");
    console.error("a Personal Access Token (PAT) with 'public_repo' scope in repository secrets:");
    console.error("  Secret Name: MARKETPLACE_TOKEN");
    console.error("  Target Repo: https://github.com/omacom/omarchy-plugin-marketplace");
    process.exit(1);
  }

  const existing = await checkExistingIssue(token, commitSha);
  if (existing) {
    console.log(`✓ An issue for commit ${commitSha} already exists:`);
    console.log(`  Issue #${existing.number}: ${existing.html_url}`);
    return;
  }

  console.log("Submitting issue to omacom/omarchy-plugin-marketplace...");
  const created = await submitIssue(title, body, token);
  console.log("✓ Successfully submitted marketplace update request!");
  console.log(`  Issue #${created.number}: ${created.html_url}`);
}

main().catch((err) => {
  console.error("❌ Failure:", err.message);
  process.exit(1);
});
