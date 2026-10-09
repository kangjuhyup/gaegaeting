import {spawn} from 'node:child_process';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {trustedRelease,firebaseProject,firebaseApp,safeReleaseResult,signingCertificate} from './policy.mjs';
const number=trustedRelease(process.env);
const manifest=JSON.parse(await readFile('build/distribution/manifest.json','utf8'));
const apk='build/app/outputs/flutter-apk/app-release.apk';
if(manifest.versionCode!==number||manifest.sourceCommit!==process.env.GITHUB_SHA||manifest.signingCertificate!==signingCertificate||manifest.storesEnabled!==false||manifest.sha256!==createHash('sha256').update(await readFile(apk)).digest('hex'))throw new Error('Distribution artifact identity mismatch.');
const cliRoot=process.env.FIREBASE_TOOLS_ROOT;
if(!cliRoot)throw new Error('Pinned Firebase CLI is not available.');
const packageInfo=JSON.parse(await readFile(join(cliRoot,'package.json'),'utf8'));
if(packageInfo.name!=='firebase-tools'||packageInfo.version!=='15.33.0')throw new Error('Unexpected Firebase CLI version.');
const groups=process.env.FIREBASE_TESTER_GROUPS?.trim();
if(groups&&!/^[a-z0-9-]+(,[a-z0-9-]+)*$/.test(groups))throw new Error('Tester groups must be explicit Firebase aliases.');
const args=[join(cliRoot,'lib/bin/firebase.js'),'appdistribution:distribute',apk,'--app',firebaseApp,'--project',firebaseProject,'--release-notes-file','build/distribution/release-notes.txt','--non-interactive','--json'];
if(groups)args.push('--groups',groups);
try{
 let output='';const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env:process.env,stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>output+=b);p.stderr.resume();p.on('error',reject);p.on('close',resolve);});
 // CLI success does not return a release object; signed binary URLs must not reach logs.
 output='';if(code!==0)throw new Error(`Firebase upload failed (${code}); raw CLI output suppressed.`);
 const require=createRequire(join(cliRoot,'package.json'));const {GoogleAuth}=require('google-auth-library');
 const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});const client=await auth.getClient();
 const response=await client.request({url:`https://firebaseappdistribution.googleapis.com/v1/projects/476922479672/apps/${firebaseApp}/releases`,params:{pageSize:100}});
 const release=response.data.releases?.find(r=>r.buildVersion===String(number)&&r.displayVersion===manifest.versionName);
 const result=safeReleaseResult({status:'success',result:release});
 await writeFile('build/distribution/firebase-release.json',JSON.stringify(result,null,2)+'\n');
 const summary=`Firebase APK ${manifest.versionName}+${number} uploaded.\n[Release](${result.firebaseConsoleUri})\nSource: ${manifest.sourceCommit}\nSHA256: ${manifest.sha256}\n${groups?'Distributed to configured tester groups.':'No tester invitations requested.'}\n`;
 if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,summary,{flag:'a'});
 console.log(`Firebase release ${manifest.versionName}+${number} verified; signed download URLs omitted.`);
}catch(error){console.error(`Distribution failed: ${error.response?.status??error.message}`);process.exitCode=1;}finally{await unlink('firebase-debug.log').catch(()=>{});}
