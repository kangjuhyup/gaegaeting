import{readFile}from'node:fs/promises';
import{join}from'node:path';
const pin=JSON.parse(await readFile('.fvmrc','utf8')).flutter;
if(!process.env.RUNNER_TEMP)throw new Error('Runner temporary directory is required.');
const actual=JSON.parse(await readFile(join(process.env.RUNNER_TEMP,'flutter-version.json'),'utf8'));
if(actual.frameworkVersion!==pin||actual.frameworkRevision!=='5fc346839b5d0eef006ed8404392afb4dfae428d'||actual.dartSdkVersion!=='3.13.5')throw new Error('Runner SDK does not match the repository pin.');
console.log('Pinned Flutter and Dart SDK verified.');
