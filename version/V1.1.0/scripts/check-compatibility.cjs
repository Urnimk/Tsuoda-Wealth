const fs=require('node:fs');
const path=require('node:path');
const semver=require('semver');
const project=require('../package.json');
const bundled=require('expo/bundledNativeModules.json');
let failures=0;
for(const [name,expected] of Object.entries(bundled)) {
 if(!(name in project.dependencies))continue;
 const actual=JSON.parse(fs.readFileSync(path.join(__dirname,'..','node_modules',name,'package.json'),'utf8')).version;
 const ok=semver.satisfies(actual,expected);console.log(`${ok?'PASS':'FAIL'} ${name}: ${actual} (Expo expects ${expected})`);if(!ok)failures++;
}
process.exitCode=failures?1:0;
