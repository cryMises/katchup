'use strict';
// Static smoke checks — no browser, no npm, no build. Proves the markup and scripts hang together:
// referenced css/js exist, every script parses, ids are unique, inline handlers resolve, and every
// getElementById target exists in the DOM.
//
//   node verify.js              check every commit reachable from HEAD
//   node verify.js <dir>        check a working tree
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const ROOT = __dirname;
const IGNORE = ['README.md', 'verify.js'];   // docs and this checker are not part of the app
const JS_GLOBALS = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'typeof', 'new', 'this', 'event', 'window', 'document', 'setTimeout', 'clearTimeout', 'parseInt', 'parseFloat', 'Number', 'String', 'Boolean', 'Math', 'JSON', 'Array', 'Object', 'Date', 'Promise', 'alert', 'confirm', 'print', 'void', 'delete', 'catch', 'else', 'do', 'in', 'of', 'instanceof', 'await', 'async', 'yield', 'throw', 'case', 'try', 'finally', 'class', 'super', 'import', 'export']);
const DOM_METHODS = new Set(['stopPropagation', 'preventDefault', 'focus', 'blur', 'click', 'toggleAttribute', 'getAttribute', 'setAttribute', 'classList', 'add', 'remove', 'toggle', 'contains', 'querySelector', 'querySelectorAll', 'getElementById']);

const norm = (s) => s.replace(/\r\n/g, '\n');
const errors = [];
const fail = (where, msg) => errors.push(where + ': ' + msg);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'katchup-verify-'));
const git = (args, opts = {}) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });

function treeFiles(dir) {
  const out = [];
  const walk = (d, rel) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (e.name === '.git' || e.name === 'node_modules') return;
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) walk(path.join(d, e.name), r);
    else out.push(r);
  });
  walk(dir, '');
  return out.sort();
}

function checks(label, files, readFile) {
  const html = readFile('index.html');
  if (html == null) return fail(label, 'index.html missing');
  if (!html.includes('lang="id"')) fail(label, 'html lang="id" missing');
  if (html.includes('<style')) fail(label, 'inline <style> block');
  const inline = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || []).length;
  if (inline !== 1) fail(label, `expected 1 inline script (tailwind config), found ${inline}`);
  for (const bad of ['bg-purple-100', 'bg-blue-100', 'animate-ping absolute inline-flex', 'font-family:Inter']) {
    if (html.includes(bad)) fail(label, 'anti-slop pattern: ' + bad);
  }

  const css = [...html.matchAll(/href="(css\/[^"]+\.css)"/g)].map((m) => m[1]);
  const js = [...html.matchAll(/src="(js\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const f of css.concat(js)) if (!files.includes(f)) fail(label, 'index.html references missing ' + f);
  if (!css.length || !js.length) fail(label, 'index.html has no css/js wiring');

  for (const f of js) {
    const p = path.join(tmp, label.replace(/[^\w.-]+/g, '_') + '-' + f.replace(/\//g, '_'));
    fs.writeFileSync(p, readFile(f));
    try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); }
    catch (e) { fail(label, `${f} does not parse: ${String(e.stderr || e.message).split('\n')[0]}`); }
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(label, 'duplicate id(s): ' + [...new Set(dup)].join(', '));

  const blob = norm(html) + '\n' + files
    .filter((f) => !IGNORE.includes(f) && (f.endsWith('.js') || f.endsWith('.css')))
    .map((f) => norm(readFile(f) || '')).join('\n');
  const declared = new Set([...blob.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of blob.matchAll(/getElementById\('([^']+)'\)/g)) {
    if (!declared.has(m[1])) fail(label, `getElementById('${m[1]}') targets an id that is never in the DOM`);
  }

  const handlers = [...html.matchAll(/on(?:click|keydown|change|input)="([^"]*)"/g)].map((m) => m[1]);
  const called = new Set();
  for (const h of handlers) {
    for (const m of h.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
      if (!JS_GLOBALS.has(m[2]) && !DOM_METHODS.has(m[2])) called.add(m[2]);
    }
    for (const m of h.matchAll(/\.([A-Za-z_$][\w$]*)\s*\(/g)) called.delete(m[1]);
  }
  for (const name of called) {
    if (!new RegExp(`(function\\s+${name}\\s*\\(|(?:let|const|var)\\s+${name}\\s*=|\\b${name}\\s*=\\s*function|window\\.${name}\\s*=)`).test(blob)) {
      fail(label, `onclick handler ${name}() is not defined anywhere in the tree`);
    }
  }
}

function checkDir(dir) {
  const label = path.basename(dir);
  const files = treeFiles(dir);
  checks(label, files, (f) => {
    const p = path.join(dir, f);
    return fs.existsSync(p) ? norm(fs.readFileSync(p, 'utf8')) : null;
  });
}

function checkHistory() {
  const shas = execSync('git rev-list --reverse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  for (const sha of shas) {
    const subject = git(['log', '-1', '--format=%s', sha]).trim();
    const label = sha.slice(0, 7) + ' ' + subject;
    const files = git(['ls-tree', '-r', '--name-only', sha]).trim().split('\n').filter(Boolean);
    const read = (f) => { try { return norm(git(['show', `${sha}:${f}`])); } catch (e) { return null; } };
    checks(label, files, read);
    if (!errors.length) console.log('✓ ' + label);
    if (errors.length) break;
  }
}

const arg = process.argv[2];
if (arg) checkDir(path.resolve(arg)); else checkHistory();

fs.rmSync(tmp, { recursive: true, force: true });
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(arg ? '✓ tree is sound' : '✓ every commit is sound');
