/**
 * Generates RS256 JWT keys and sets Convex Auth core env vars on production:
 * SITE_URL (Vercel), JWT_PRIVATE_KEY, JWKS (matching pair).
 */
import { spawnSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const SITE_URL = "https://primestudytracker.vercel.app";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {string[]} args */
function run(args) {
  const r = spawnSync("npx", args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const keys = await generateKeyPair("RS256");
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
const jwtPrivateKey = privateKey.trimEnd().replace(/\n/g, " ");

const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const jwtFile = join(tmpdir(), `convex-jwt-${id}.txt`);
const jwksFile = join(tmpdir(), `convex-jwks-${id}.txt`);
writeFileSync(jwtFile, jwtPrivateKey, "utf8");
writeFileSync(jwksFile, jwks, "utf8");

console.log("Setting SITE_URL, JWT_PRIVATE_KEY, JWKS on Convex production…");
try {
  run(["convex", "env", "set", "--prod", "SITE_URL", SITE_URL]);
  run([
    "convex",
    "env",
    "set",
    "--prod",
    "JWT_PRIVATE_KEY",
    "--from-file",
    jwtFile,
  ]);
  run(["convex", "env", "set", "--prod", "JWKS", "--from-file", jwksFile]);
} finally {
  try {
    unlinkSync(jwtFile);
  } catch {
    /* ignore */
  }
  try {
    unlinkSync(jwksFile);
  } catch {
    /* ignore */
  }
}
console.log("Done.");
