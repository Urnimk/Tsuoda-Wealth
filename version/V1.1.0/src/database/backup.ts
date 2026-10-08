import type {SQLiteDatabase} from 'expo-sqlite';
import type {Asset,SnapshotWithItems} from '../types/models';
import {assetCategories} from '../types/models';
import {getAutoDay,listAssets,listSnapshots} from './database';
export interface Backup { format:'asset-dual-view';version:2;exportedAt:string;assets:Asset[];snapshots:SnapshotWithItems[];autoDay:number; }
export async function exportBackup(db:SQLiteDatabase):Promise<string> {
  let result='';
  await db.withExclusiveTransactionAsync(async tx=>{
    result=JSON.stringify({format:'asset-dual-view',version:2,exportedAt:new Date().toISOString(),assets:await listAssets(tx),snapshots:await listSnapshots(tx),autoDay:await getAutoDay(tx)},null,2);
  });
  return result;
}
export function parseBackup(text:string):Backup {
  if(text.length>20_000_000)throw new Error('備份超過20MB上限');
  const b:Backup=JSON.parse(text);
  const fail=()=>{throw new Error('備份格式或資料驗證失敗');};
  const str=(v:unknown)=>typeof v==='string';
  const nonnegative=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  const cents=(v:unknown)=>nonnegative(v)&&Number.isSafeInteger(v)&&Number(v)<=100_000_000_000_000;
  const id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
  if(!b||b.format!=='asset-dual-view'||b.version!==2||!Array.isArray(b.assets)||!Array.isArray(b.snapshots)||!Number.isInteger(b.autoDay)||b.autoDay<0||b.autoDay>28)fail();
  const ids=new Set<number>();
  for(const a of b.assets){
    if(!a||!id(a.id)||ids.has(a.id)||!str(a.name)||!a.name.trim()||!str(a.unit)||!a.unit.trim()||!assetCategories.includes(a.category)||!nonnegative(a.quantity)||!nonnegative(a.unitPrice)||!cents(a.amountCents)||!str(a.note)||!str(a.createdAt)||!str(a.updatedAt))fail();
    ids.add(a.id);
  }
  if(!Number.isSafeInteger(b.assets.reduce((n,a)=>n+a.amountCents,0)))fail();
  const months=new Set<string>(),heads=new Set<number>(),items=new Set<number>();
  for(const s of b.snapshots){
    if(!s||!id(s.id)||heads.has(s.id)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(s.yearMonth)||months.has(s.yearMonth)||!str(s.recordedAt)||!Number.isFinite(Date.parse(s.recordedAt))||!nonnegative(s.totalAmount)||!Array.isArray(s.items))fail();
    months.add(s.yearMonth);heads.add(s.id);const assets=new Set<number>();
    for(const i of s.items){
      if(!i||!id(i.id)||items.has(i.id)||i.snapshotId!==s.id||!id(i.assetId)||assets.has(i.assetId)||!str(i.assetName)||!str(i.unit)||!nonnegative(i.quantity)||!nonnegative(i.unitPrice)||!cents(i.amountCents)||i.amount!==i.amountCents/100)fail();
      items.add(i.id);assets.add(i.assetId);
    }
    const total=s.items.reduce((n,i)=>n+i.amountCents,0);
    if(!Number.isSafeInteger(total)||Math.abs(s.totalAmount-total/100)>0.000001)fail();
  }
  return b;
}
export async function restoreBackup(db:SQLiteDatabase,text:string) {
  const b=parseBackup(text); // 所有驗證在刪除任何資料之前完成。
  await db.withExclusiveTransactionAsync(async tx=>{
    await tx.execAsync('DELETE FROM monthly_snapshot_items; DELETE FROM monthly_snapshots; DELETE FROM assets; DELETE FROM app_settings;');
    for(const a of b.assets)await tx.runAsync('INSERT INTO assets(id,name,category,unit,quantity,unitPrice,amountCents,note,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)',a.id,a.name,a.category,a.unit,a.quantity,a.unitPrice,a.amountCents,a.note,a.createdAt,a.updatedAt);
    let highestAsset=0;
    for(const s of b.snapshots){
      await tx.runAsync('INSERT INTO monthly_snapshots(id,yearMonth,recordedAt,totalAmount) VALUES(?,?,?,?)',s.id,s.yearMonth,s.recordedAt,s.totalAmount);
      for(const i of s.items){
        highestAsset=Math.max(highestAsset,i.assetId);
        await tx.runAsync('INSERT INTO monthly_snapshot_items(id,snapshotId,assetId,assetName,unit,quantity,unitPrice,amount,amountCents) VALUES(?,?,?,?,?,?,?,?,?)',i.id,s.id,i.assetId,i.assetName,i.unit,i.quantity,i.unitPrice,i.amount,i.amountCents);
      }
    }
    // 已刪除資產也不能被未來新增的 ID 重用。
    const seq=await tx.getFirstAsync<{seq:number}>("SELECT seq FROM sqlite_sequence WHERE name='assets'");
    if(!seq)await tx.runAsync("INSERT INTO sqlite_sequence(name,seq) VALUES('assets',?)",highestAsset);
    else if(seq.seq<highestAsset)await tx.runAsync("UPDATE sqlite_sequence SET seq=? WHERE name='assets'",highestAsset);
    await tx.runAsync('INSERT INTO app_settings(key,value) VALUES(?,?)','autoDay',String(b.autoDay));
  });
}
