// Vercel build step: writes dist/version.js with the deployed commit and its time (no dependencies).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const git = cmd => { try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const sha = process.env.VERCEL_GIT_COMMIT_SHA || git('git rev-parse HEAD') || 'unknown';
const time = git(`git show -s --format=%cI ${sha}`) || new Date().toISOString();
const message = (process.env.VERCEL_GIT_COMMIT_MESSAGE || git(`git show -s --format=%s ${sha}`)).split('\n')[0].slice(0, 120);
const info = { sha, time, message };
writeFileSync(new URL('../dist/version.js', import.meta.url), `window.DIN_VERSION=${JSON.stringify(info)};\n`);
console.log('version.js', info);
