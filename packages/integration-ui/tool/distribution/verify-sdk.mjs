import{readFile}from'node:fs/promises';
const pin=JSON.parse(await readFile('.fvmrc','utf8')).flutter;
const actual=JSON.parse(await readFile(process.argv[2],'utf8'));
if(actual.frameworkVersion!==pin||actual.frameworkRevision!=='5fc346839b5d0eef006ed8404392afb4dfae428d'||actual.dartSdkVersion!=='3.13.5')throw new Error('Runner SDK does not match the repository pin.');
console.log(`Flutter ${pin} / Dart ${actual.dartSdkVersion} verified.`);
