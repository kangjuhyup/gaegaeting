import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {trustedRelease,publicDevDefines,signingCertificate} from './policy.mjs';
const number=trustedRelease(process.env);
publicDevDefines(JSON.parse(await readFile('.dart-define.stg.example.json','utf8')));
const dir=await mkdtemp(join(process.env.RUNNER_TEMP,'mobile-signing-'));
function capture(command,args,env=process.env){return new Promise((resolve,reject)=>{
 const p=spawn(command,args,{env,stdio:['ignore','pipe','pipe']});let stdout='';p.stdout.on('data',b=>stdout+=b);p.stderr.resume();
 p.on('error',()=>reject(new Error('Required distribution tool is unavailable.')));
 p.on('close',code=>code?reject(new Error(`${command} failed (exit ${code}); sensitive output suppressed.`)):resolve(stdout));
});}
try{
 const names=['MOBILE_DEV_ANDROID_KEYSTORE_BASE64','MOBILE_DEV_ANDROID_STORE_PASSWORD','MOBILE_DEV_ANDROID_KEY_ALIAS','MOBILE_DEV_ANDROID_KEY_PASSWORD'];
 const values=await Promise.all(names.map(name=>capture('doppler',['secrets','get',name,'--plain','--project','gaegaeting','--config','stg','--silent'])));
 if(values.some(v=>!v.trim()))throw new Error('Mobile signing configuration is incomplete.');
 const key=join(dir,'internal.jks');await writeFile(key,Buffer.from(values[0].trim(),'base64'),{mode:0o600});
 const env={...process.env,GAEGAETING_REQUIRE_UPLOAD_SIGNING:'true',GAEGAETING_UPLOAD_STORE_FILE:key,GAEGAETING_UPLOAD_STORE_PASSWORD:values[1].trim(),GAEGAETING_UPLOAD_KEY_ALIAS:values[2].trim(),GAEGAETING_UPLOAD_KEY_PASSWORD:values[3].trim()};
 delete env.DOPPLER_TOKEN;
 for(const v of values.slice(1)){process.stdout.write(`::add-mask::${v.trim()}\n`);}
 await new Promise((resolve,reject)=>{const p=spawn('flutter',['build','apk','--release','--no-pub','--target=lib/main.dart','--build-name=0.1.0',`--build-number=${number}`,'--dart-define-from-file=.dart-define.stg.example.json'],{env,stdio:['ignore','inherit','inherit']});p.on('error',reject);p.on('close',code=>code?reject(new Error(`Flutter APK build failed (${code}).`)):resolve());});
 const apk='build/app/outputs/flutter-apk/app-release.apk';
 const tools=join(process.env.ANDROID_HOME,'build-tools','36.0.0');
 const cert=await capture(join(tools,'apksigner'),['verify','--print-certs',apk],env);
 if(!cert.toLowerCase().includes(`sha-256 digest: ${signingCertificate}`))throw new Error('APK signature differs from the existing shared app.');
 const badging=await capture(join(tools,'aapt'),['dump','badging',apk],env);
 if(!badging.includes(`name='app.gaegaeting'`)||!badging.includes(`versionCode='${number}'`)||badging.includes('application-debuggable'))throw new Error('Unexpected APK package, version, or debug flag.');
 await mkdir('build/distribution',{recursive:true});
 const bytes=await readFile(apk);const manifest={versionName:'0.1.0',versionCode:number,packageName:'app.gaegaeting',sourceCommit:process.env.GITHUB_SHA,sha256:createHash('sha256').update(bytes).digest('hex'),signingCertificate,storesEnabled:false};
 await writeFile('build/distribution/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 await writeFile('build/distribution/release-notes.txt',`개개팅 개발 테스트 0.1.0 (${number})\n개발 API 연결 / 스토어 결제 비활성\nSource: ${process.env.GITHUB_SHA}\n\n${await readFile('tool/distribution/release-notes.txt','utf8')}`);
}catch(error){console.error(error.message);process.exitCode=1;}finally{await rm(dir,{recursive:true,force:true});}
