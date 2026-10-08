const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const repo=require('../src/database/database.ts');
const utils=require('../src/utils/format.ts');
function adapter(file=':memory:') {
 const raw=new DatabaseSync(file);
 const db={raw,execAsync:async sql=>raw.exec(sql),
 getFirstAsync:async(sql,...p)=>raw.prepare(sql).get(...p)??null,
 getAllAsync:async(sql,...p)=>raw.prepare(sql).all(...p),
 runAsync:async(sql,...p)=>{const r=raw.prepare(sql).run(...p);return {changes:Number(r.changes),lastInsertRowId:Number(r.lastInsertRowid)};},
 withExclusiveTransactionAsync:async fn=>{raw.exec('BEGIN IMMEDIATE');try{await fn(db);raw.exec('COMMIT');}catch(e){raw.exec('ROLLBACK');throw e;}}};return db;
}
const gold={name:'黃金',category:'黃金',unit:'g',quantity:7,unitPrice:3000,amountCents:500000,note:''};
async function fresh(){const db=adapter();await repo.initializeDatabase(db);return db;}
test('CRUD: 金額與數量獨立保存，同名資產以 ID 區分',async()=>{const db=await fresh();try{
 await repo.saveAsset(db,gold);await repo.saveAsset(db,gold);let a=await repo.listAssets(db);assert.equal(a.length,2);assert.notEqual(a[0].id,a[1].id);
 await repo.saveAsset(db,{...gold,quantity:8},a[0].id);a=await repo.listAssets(db);assert.equal(a[0].amountCents,500000);assert.equal(a[0].quantity,8);
 await repo.removeAsset(db,a[1].id);assert.equal((await repo.listAssets(db)).length,1);
 }finally{db.raw.close();}});
test('快照不受改名、價格、數量或刪除影響，ID 不重用',async()=>{const db=await fresh();try{
 await repo.saveAsset(db,gold);const [a]=await repo.listAssets(db);await repo.saveSnapshot(db,'2026-01');const before=JSON.stringify(await repo.listSnapshots(db));
 await repo.saveAsset(db,{...gold,name:'新名稱',quantity:9,unitPrice:10,amountCents:123},a.id);assert.equal(JSON.stringify(await repo.listSnapshots(db)),before);
 await repo.removeAsset(db,a.id);await repo.saveAsset(db,gold);assert.notEqual((await repo.listAssets(db))[0].id,a.id);assert.equal(JSON.stringify(await repo.listSnapshots(db)),before);
 }finally{db.raw.close();}});
test('同月拒絕重複、確認後原子覆寫、不同月獨立',async()=>{const db=await fresh();try{
 await repo.saveAsset(db,gold);await repo.saveSnapshot(db,'2026-01');await assert.rejects(repo.saveSnapshot(db,'2026-01'),/SNAPSHOT_EXISTS/);
 const [a]=await repo.listAssets(db);await repo.saveAsset(db,{...gold,amountCents:700000},a.id);await repo.saveSnapshot(db,'2026-02');await repo.saveSnapshot(db,'2026-02',true);
 const r=await repo.listSnapshots(db);assert.equal(r.length,2);assert.equal(r[0].totalAmount,5000);assert.equal(r[1].totalAmount,7000);
 }finally{db.raw.close();}});
test('覆寫中途 SQL 失敗回滾，原快照完整保留',async()=>{const db=await fresh();try{
 await repo.saveAsset(db,gold);await repo.saveSnapshot(db,'2026-01');const before=JSON.stringify(await repo.listSnapshots(db));
 db.raw.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON monthly_snapshot_items BEGIN SELECT RAISE(ABORT, 'forced failure'); END");
 await assert.rejects(repo.saveSnapshot(db,'2026-01',true),/forced failure/);assert.equal(JSON.stringify(await repo.listSnapshots(db)),before);
 }finally{db.raw.close();}});
test('實體 DB 關閉重開與重複 migration 保留資料',async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assets-'));const file=path.join(dir,'test.db');let db=adapter(file);try{
 await repo.initializeDatabase(db);await repo.saveAsset(db,gold);await repo.saveSnapshot(db,'2026-01');db.raw.close();db=adapter(file);await repo.initializeDatabase(db);
 assert.equal((await repo.listAssets(db))[0].quantity,7);assert.equal((await repo.listSnapshots(db))[0].totalAmount,5000);
 }finally{db.raw.close();fs.rmSync(dir,{recursive:true,force:true});}});
test('輸入拒絕負數、NaN、不安全金額、空名稱、單位變更及不存在 ID',async()=>{const db=await fresh();try{
 for(const x of [{quantity:-1},{quantity:NaN},{amountCents:Infinity},{amountCents:1.1},{name:''}])await assert.rejects(repo.saveAsset(db,{...gold,...x}));
 await repo.saveAsset(db,gold);const [a]=await repo.listAssets(db);await assert.rejects(repo.saveAsset(db,{...gold,unit:'kg'},a.id));await assert.rejects(repo.saveAsset(db,gold,999));
 await assert.rejects(repo.saveSnapshot(db,'2026-13'));
 }finally{db.raw.close();}});
test('整數分合計避免 0.1+0.2 漂移；空資產可手動記零',async()=>{const db=await fresh();try{
 await repo.saveSnapshot(db,'2026-01');assert.equal((await repo.listSnapshots(db))[0].totalAmount,0);
 await repo.saveAsset(db,{...gold,amountCents:10});await repo.saveAsset(db,{...gold,amountCents:20});await repo.saveSnapshot(db,'2026-02');assert.equal((await repo.listSnapshots(db))[1].totalAmount,0.3);
 }finally{db.raw.close();}});
test('近12個月包含當月、排除13個月前與未來月份',()=>{
 const records=['2025-10','2025-11','2026-10','2026-11'].map(yearMonth=>({yearMonth}));
 assert.deepEqual(utils.rangeSnapshots(records,'12m',new Date(2026,9,8)).map(x=>x.yearMonth),['2025-11','2026-10']);
 assert.equal(utils.validNumber('Infinity'),null);assert.equal(utils.validNumber('-1'),null);assert.equal(utils.validNumber('7.25'),7.25);
});
test('自動快照：指定日前不記錄、空資料不記、當月只記一次、不補過去',async()=>{const db=await fresh();try{
 await repo.setAutoDay(db,15);assert.equal(await repo.getAutoDay(db),15);
 assert.equal(await repo.recordDueSnapshot(db,new Date(2026,8,20)),false);
 await repo.saveAsset(db,gold);assert.equal(await repo.recordDueSnapshot(db,new Date(2026,8,14)),false);
 assert.equal(await repo.recordDueSnapshot(db,new Date(2026,8,20)),true);
 const before=JSON.stringify(await repo.listSnapshots(db));assert.equal(await repo.recordDueSnapshot(db,new Date(2026,8,21)),false);assert.equal(JSON.stringify(await repo.listSnapshots(db)),before);
 await repo.recordDueSnapshot(db,new Date(2026,10,20));assert.deepEqual((await repo.listSnapshots(db)).map(x=>x.yearMonth),['2026-09','2026-11']);
 await repo.setAutoDay(db,0);assert.equal(await repo.recordDueSnapshot(db,new Date(2026,11,20)),false);
 await assert.rejects(repo.setAutoDay(db,29));await assert.rejects(repo.setAutoDay(db,1.5));
 }finally{db.raw.close();}});
test('v1 升級 v2：舊資產由數量單價換算、舊快照保持當年值',async()=>{const db=adapter();try{
 db.raw.exec(`CREATE TABLE assets(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,category TEXT,unit TEXT,quantity REAL,unitPrice REAL,note TEXT,createdAt TEXT,updatedAt TEXT);
 CREATE TABLE monthly_snapshots(id INTEGER PRIMARY KEY,yearMonth TEXT,recordedAt TEXT,totalAmount REAL);
 CREATE TABLE monthly_snapshot_items(id INTEGER PRIMARY KEY,snapshotId INTEGER,assetId INTEGER,assetName TEXT,unit TEXT,quantity REAL,unitPrice REAL,amount REAL);
 CREATE TABLE app_settings(key TEXT PRIMARY KEY,value TEXT);
 INSERT INTO assets VALUES(1,'黃金','黃金','g',7,3000,'','old','old');
 INSERT INTO monthly_snapshots VALUES(1,'2025-01','old',5000);
 INSERT INTO monthly_snapshot_items VALUES(1,1,1,'黃金','g',5,1000,5000);
 PRAGMA user_version=1;`);
 await repo.initializeDatabase(db);assert.equal((await repo.listAssets(db))[0].amountCents,2100000);assert.equal((await repo.listSnapshots(db))[0].items[0].amountCents,500000);
 }finally{db.raw.close();}});
const backup=require('../src/database/backup.ts');
test('JSON 備份還原：資產、歷史、設定一致，已刪除資產ID不可重用',async()=>{const db=await fresh(),target=await fresh();try{
 await repo.saveAsset(db,gold);await repo.saveSnapshot(db,'2026-01');await repo.removeAsset(db,1);await repo.setAutoDay(db,12);
 const text=await backup.exportBackup(db);await backup.restoreBackup(target,text);
 assert.deepEqual(await repo.listSnapshots(target),await repo.listSnapshots(db));assert.equal(await repo.getAutoDay(target),12);
 await repo.saveAsset(target,gold);assert.ok((await repo.listAssets(target))[0].id>1);
 }finally{db.raw.close();target.raw.close();}});
test('損壞備份與還原SQL失敗不清除既有資料',async()=>{const db=await fresh();try{
 await repo.saveAsset(db,gold);await repo.saveSnapshot(db,'2026-01');const text=await backup.exportBackup(db);
 await assert.rejects(backup.restoreBackup(db,'{"format":"wrong"}'));
 const malformed=JSON.parse(text);malformed.snapshots[0].totalAmount=123;await assert.rejects(backup.restoreBackup(db,JSON.stringify(malformed)));
 db.raw.exec("CREATE TRIGGER fail_restore BEFORE INSERT ON assets BEGIN SELECT RAISE(ABORT, 'restore failure'); END");
 await assert.rejects(backup.restoreBackup(db,text),/restore failure/);
 assert.equal((await repo.listAssets(db))[0].amountCents,500000);assert.equal((await repo.listSnapshots(db))[0].totalAmount,5000);
 }finally{db.raw.close();}});
