import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import branchPolicy from '../.github/scripts/branch-policy.cjs';

export const serviceRoots = {
  account: 'packages/account', match: 'packages/match', chat: 'packages/chat',
  gateway: 'packages/gateway', 'edge-authz': 'packages/gateway',
  'integration-ui': 'packages/integration-ui', 'admin-ui': 'packages/admin-ui',
};
export const services = Object.keys(serviceRoots);
const domainServices = { core: services, account: ['account'], match: ['match'], gateway: ['gateway', 'edge-authz'] };
const sharedRuntime = new Set(['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc', '.nvmrc', '.dockerignore', 'tsconfig.json', 'scripts/build.mjs', 'deploy/docker/Dockerfile']);
const git = (cwd, args) => execFileSync('/usr/bin/git', args, { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const diff = (cwd, range) => git(cwd, ['diff', '--name-only', '--no-renames', '-z', ...range]).split('\0').filter(Boolean);

export function pendingPullRequestFiles(cwd, base, head, main = 'origin/main') {
  // Exclude released main carryover and inverse changes from stale domain branches.
  const outstanding = new Set(diff(cwd, [main, head]));
  const unpublished = new Set(diff(cwd, [`${main}...${head}`]));
  return diff(cwd, [`${base}...${head}`]).filter(file => outstanding.has(file) && unpublished.has(file));
}

export function loadPackages(cwd, revisions) {
  return revisions.flatMap(revision => git(cwd, ['ls-tree', '-r', '--name-only', revision]).split('\n')
    .filter(file => /^packages\/(?:core\/)?[^/]+\/package\.json$/.test(file))
    .map(file => {
      const pkg = JSON.parse(git(cwd, ['show', `${revision}:${file}`]));
      const deps = { ...pkg.dependencies, ...pkg.optionalDependencies, ...pkg.peerDependencies };
      return { dir: file.slice(0, -'/package.json'.length), name: pkg.name,
        dependencies: Object.entries(deps).filter(([, version]) => version.startsWith('workspace:')).map(([name]) => name) };
    }));
}

function workspaceConsumers(packages) {
  const dependencies = new Map();
  for (const pkg of packages) {
    const deps = dependencies.get(pkg.name) ?? new Set();
    for (const name of pkg.dependencies) deps.add(name);
    dependencies.set(pkg.name, deps);
  }
  const consumes = (name, dependency, visited = new Set()) => {
    if (name === dependency) return true;
    if (visited.has(name)) return false;
    visited.add(name);
    return [...(dependencies.get(name) ?? [])].some(next => consumes(next, dependency, visited));
  };
  return owners => services.filter(service => packages.some(root => root.dir === serviceRoots[service]
    && owners.some(owner => consumes(root.name, owner.name))));
}

function isVerificationOnly(file) {
  return /^(?:docs|\.agents|\.github|scripts)\//.test(file) || /(?:^|\/)AGENTS\.md$/.test(file)
    || /(?:^|\/)README(?:\.[^/]*)?$/.test(file) || (!file.startsWith('packages/') && file.endsWith('.md'))
    || ['.gitignore', '.gitattributes', 'sonar-project.properties', '.sonarcloud.properties', '.prettierignore'].includes(file)
    || /(?:^|\/)(?:test|tests|docs)\//.test(file) || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file);
}

export function affectedServices(files, packages) {
  const affected = new Set();
  const consumers = workspaceConsumers(packages);
  for (const file of files) {
    if (sharedRuntime.has(file)) { services.forEach(service => affected.add(service)); continue; }
    if (file === 'deploy/docker/ui-server.mjs') { affected.add('integration-ui'); affected.add('admin-ui'); continue; }
    if (isVerificationOnly(file)) continue;
    const owners = packages.filter(pkg => file === pkg.dir + '/package.json' || file.startsWith(pkg.dir + '/'));
    if (!owners.length) { services.forEach(service => affected.add(service)); continue; }
    consumers(owners).forEach(service => affected.add(service));
  }
  return services.filter(service => affected.has(service));
}

export function planImages({ files, packages, domain, verifyService = 'affected' }) {
  const allowed = domainServices[domain];
  if (!allowed) throw new Error('Unknown image domain');
  const publishServices = affectedServices(files, packages);
  if (publishServices.some(service => !allowed.includes(service))) {
    throw new Error('Runtime changes cross the branch domain; split the feature or use a core release');
  }
  if (verifyService !== 'affected' && !allowed.includes(verifyService)) throw new Error('Invalid verification service for branch domain');
  return { domain, services: services.filter(service => publishServices.includes(service) || service === verifyService), publishServices };
}

function releaseDomain(repository, revision) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw new Error('Invalid repository');
  const gh = process.platform === 'darwin' ? '/opt/homebrew/bin/gh' : '/usr/bin/gh';
  const prs = JSON.parse(execFileSync(gh, ['api', `repos/${repository}/commits/${revision}/pulls`], { encoding: 'utf8' }));
  const release = prs.filter(pr => pr.merged_at && pr.merge_commit_sha === revision && pr.base.ref === 'main'
    && branchPolicy.parseBranch(pr.head.ref)?.kind === 'release');
  if (release.length !== 1) throw new Error('Main image publication requires one merged release PR');
  return branchPolicy.parseBranch(release[0].head.ref).domain;
}

export function runScope(env = process.env, cwd = process.cwd()) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, 'utf8'));
  let files, base, head, domain;
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    ({ base: { sha: base }, head: { sha: head } } = event.pull_request);
    const source = branchPolicy.parseBranch(event.pull_request.head.ref);
    domain = source?.kind === 'main' ? branchPolicy.parseBranch(event.pull_request.base.ref)?.domain : source?.domain;
    files = pendingPullRequestFiles(cwd, base, head);
  } else if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/main') {
    base = event.before; head = event.after;
    if (head !== env.GITHUB_SHA) throw new Error('Push revision mismatch');
    domain = releaseDomain(env.GITHUB_REPOSITORY, head);
    files = diff(cwd, [base, head]);
  } else if (env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    head = env.GITHUB_SHA;
    if (env.GITHUB_REF === 'refs/heads/main') {
      base = git(cwd, ['rev-parse', `${head}^`]).trim();
      domain = releaseDomain(env.GITHUB_REPOSITORY, head);
      files = diff(cwd, [base, head]);
    } else {
      base = 'origin/main';
      domain = branchPolicy.parseBranch(env.GITHUB_REF_NAME)?.domain;
      files = pendingPullRequestFiles(cwd, base, head);
    }
  } else throw new Error('Unsupported image workflow event');
  const packages = loadPackages(cwd, [base, head]);
  const plan = planImages({ files, packages, domain, verifyService: event.inputs?.['verify-service'] ?? 'affected' });
  appendFileSync(env.GITHUB_OUTPUT, `services=${JSON.stringify(plan.services)}\npublishServices=${JSON.stringify(plan.publishServices)}\n`);
  console.log(JSON.stringify({ ...plan, changedFileCount: files.length }));
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,
    `### Image scope (${domain})\nBuild: ${plan.services.join(', ') || 'none'}\n\nRuntime artifacts: ${plan.publishServices.join(', ') || 'none'}\n`);
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { runScope(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
