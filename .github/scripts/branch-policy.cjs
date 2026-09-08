const domains = ['account', 'match', 'gateway', 'core'];
const domainPattern = `(${domains.join('|')})`;
const taskPattern = new RegExp(`^(feat|fix|refactor|chore|docs|test)/${domainPattern}/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const devPattern = new RegExp(`^dev/${domainPattern}$`);
const version = '(?:0|[1-9][0-9]*)';
const releasePattern = new RegExp(`^release/${domainPattern}/${version}\\.${version}\\.${version}$`);

function parseBranch(name) {
  if (name === 'main') return { kind: 'main' };
  let match = taskPattern.exec(name);
  if (match) return { kind: 'task', type: match[1], domain: match[2] };
  match = devPattern.exec(name);
  if (match) return { kind: 'dev', domain: match[1] };
  match = releasePattern.exec(name);
  if (match) return { kind: 'release', domain: match[1] };
  return null;
}

function evaluatePullRequest(pr) {
  const head = parseBranch(pr?.head?.ref);
  const base = parseBranch(pr?.base?.ref);
  if (!head || !base) return { allowed: false, reason: 'Invalid branch name or unsupported domain/version' };
  if (!pr.head.repo?.full_name || pr.head.repo.full_name !== pr.base.repo?.full_name) {
    return { allowed: false, reason: 'Integration branches must originate in this repository' };
  }
  const sameDomain = head.domain === base.domain;
  const allowed =
    (base.kind === 'main' && head.kind === 'release') ||
    (base.kind === 'dev' && (head.kind === 'main' || (sameDomain && ['task', 'release'].includes(head.kind)))) ||
    (base.kind === 'release' && (head.kind === 'main' || (sameDomain && head.kind === 'task' && head.type === 'fix')));
  return { allowed, reason: allowed ? 'Branch flow allowed' : 'Source branch cannot merge into this target' };
}

module.exports = { domains, parseBranch, evaluatePullRequest };

if (require.main === module) {
  const event = JSON.parse(require('node:fs').readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const result = evaluatePullRequest(event.pull_request);
  console.log(result.reason);
  process.exitCode = result.allowed ? 0 : 1;
}
