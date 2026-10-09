import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {trustedRelease,publicDevDefines,safeReleaseResult} from '../tool/distribution/policy.mjs';
const env = {GITHUB_REPOSITORY:'kangjuhyup/gaegaeting',GITHUB_REF:'refs/heads/dev/core',GITHUB_EVENT_NAME:'push',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_NUMBER:'7'};
const defines = JSON.parse(await readFile(new URL('../.dart-define.stg.example.json',import.meta.url)));
test('trusted development build retries retain a version greater than the manually shared APK',()=>{
  assert.equal(trustedRelease(env),1007); assert.equal(trustedRelease({...env,GITHUB_RUN_ATTEMPT:'2'}),1007);
});
for (const change of [{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_EVENT_NAME:'pull_request_target'},{GITHUB_REPOSITORY:'external/fork'},{GITHUB_REF:'refs/heads/feat/core/arbitrary'},{GITHUB_SHA:'untrusted'},{GITHUB_RUN_NUMBER:'7; echo token'}]) {
  test(`untrusted release context is refused: ${JSON.stringify(change)}`,()=>assert.throws(()=>trustedRelease({...env,...change})));
}
test('public development settings preserve native client and disabled purchases',()=>assert.deepEqual(publicDevDefines(defines),defines));
for (const change of [{STORE_PURCHASES_ENABLED:true},{OIDC_CLIENT_ID:'web-client'},{ADMIN_TOKEN:'fixture'},{GATEWAY_GRAPHQL_URL:'https://prod.example/graphql'},{IMAGE_STORAGE_ORIGIN:'https://storage.example/?token=fixture'},{ACCOUNT_GRAPHQL_URL:'https://user:password@example.test'}]) {
  test(`unsafe public configuration is refused: ${Object.keys(change)[0]}`,()=>assert.throws(()=>publicDevDefines({...defines,...change})));
}
test('release results exclude signed binary URLs and credentials',()=>{
  const value={status:'success',result:{name:'projects/476922479672/apps/1:476922479672:android:d37c950269629567fad2cd/releases/review',buildVersion:'1007',binaryDownloadUri:'secret',access_token:'secret'}};
  assert.equal(JSON.stringify(safeReleaseResult(value)).includes('secret'),false);
});
test('wrong app or failed upload cannot be reported as a release',()=>{
  assert.throws(()=>safeReleaseResult({status:'error'})); assert.throws(()=>safeReleaseResult({status:'success',result:{name:'projects/other/apps/other/releases/1'}}));
});
