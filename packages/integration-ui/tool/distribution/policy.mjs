export const firebaseProject = 'gaegaeting-dev';
export const firebaseApp = '1:476922479672:android:d37c950269629567fad2cd';
export const signingCertificate = '6c5adb422575a4118d51cd2389c79e33657051759ee8ec7088b1e2a36b4cdc2f';
export function trustedRelease(env) {
  if (env.GITHUB_REPOSITORY !== 'kangjuhyup/gaegaeting' ||
      !['refs/heads/dev/core', 'refs/heads/main'].includes(env.GITHUB_REF) ||
      !['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
      !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '') ||
      !/^[1-9][0-9]{0,6}$/.test(env.GITHUB_RUN_NUMBER ?? '')) {
    throw new Error('Mobile release requires the trusted repository, protected branch and build identity.');
  }
  // Workflow run numbers increase across branches; retries retain the same version.
  return 1000 + Number(env.GITHUB_RUN_NUMBER);
}
export function publicDevDefines(value) {
  const allowed = new Set(['API_ENABLED','STORE_PURCHASES_ENABLED','GATEWAY_GRAPHQL_URL','ACCOUNT_GRAPHQL_URL','OIDC_ISSUER','OIDC_CLIENT_ID','OIDC_REDIRECT_URI','OIDC_LOGOUT_URI','API_AUDIENCE','MAP_TILE_URL','MAP_ATTRIBUTION','IMAGE_STORAGE_ORIGIN']);
  if (Object.keys(value).some(key => !allowed.has(key)) ||
      value.API_ENABLED !== true || value.STORE_PURCHASES_ENABLED !== false ||
      value.GATEWAY_GRAPHQL_URL !== 'https://test-ggt-api.rvkang.app/gateway/graphql' ||
      value.OIDC_ISSUER !== 'https://auth.rvkang.app/t/gaegaeting-dev/oidc' ||
      value.OIDC_CLIENT_ID !== 'gaegaeting-mobile' ||
      value.API_AUDIENCE !== 'https://test-ggt-api.rvkang.app' ||
      value.OIDC_REDIRECT_URI !== 'app.gaegaeting:/oauth/callback' ||
      value.OIDC_LOGOUT_URI !== 'app.gaegaeting:/oauth/logout') {
    throw new Error('Internal builds require public development settings and disabled purchases.');
  }
  for (const [key, raw] of Object.entries(value)) {
    if (!key.endsWith('_URL') && !key.endsWith('_ORIGIN') && !key.endsWith('_ISSUER') && !key.endsWith('_AUDIENCE')) continue;
    if (!raw) continue;
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.protocol !== 'https:') throw new Error('Public connection settings cannot contain credentials or query tokens.');
  }
  return value;
}
export function safeReleaseResult(value) {
  const release = value?.result?.release ?? value?.result ?? value?.release;
  if (value?.status !== 'success' || !release?.name?.startsWith('projects/476922479672/apps/1:476922479672:android:d37c950269629567fad2cd/releases/')) {
    throw new Error('Firebase did not return a release for the expected app.');
  }
  return { name: release.name, displayVersion: release.displayVersion, buildVersion: release.buildVersion,
    firebaseConsoleUri: release.firebaseConsoleUri, testingUri: release.testingUri };
}
