import type { SQLiteDatabase } from 'expo-sqlite';
import type { Asset, AssetInput, MonthlySnapshot, SnapshotItem, SnapshotWithItems } from '../types/models';
import { amountOf, localYearMonth } from '../utils/format';

// Migrations are static SQL, never interpolate form values into execAsync.
export async function initializeDatabase(db:SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = await db.getFirstAsync<{user_version:number}>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > 2) throw new Error('資料庫來自較新版本，請更新 App；不會降版或清除資料');
  if ((version?.user_version ?? 0) < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, category TEXT NOT NULL, unit TEXT NOT NULL,
        quantity REAL NOT NULL CHECK(quantity>=0), unitPrice REAL NOT NULL CHECK(unitPrice>=0),
        note TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS monthly_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, yearMonth TEXT NOT NULL UNIQUE,
        recordedAt TEXT NOT NULL, totalAmount REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS monthly_snapshot_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snapshotId INTEGER NOT NULL REFERENCES monthly_snapshots(id) ON DELETE CASCADE,
        assetId INTEGER NOT NULL, assetName TEXT NOT NULL, unit TEXT NOT NULL,
        quantity REAL NOT NULL, unitPrice REAL NOT NULL, amount REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_snapshot_items_id ON monthly_snapshot_items(snapshotId);
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      PRAGMA user_version = 1;
    `);
  }
  // v1 原型可原地升級；快照只以既存 amount 回填，不讀目前資產。
  if ((version?.user_version ?? 0) < 2) {
    await db.withExclusiveTransactionAsync(async tx => {
      await tx.execAsync(`
        ALTER TABLE assets ADD COLUMN amountCents INTEGER NOT NULL DEFAULT 0;
        UPDATE assets SET amountCents=CAST(ROUND(quantity*unitPrice*100) AS INTEGER);
        ALTER TABLE monthly_snapshot_items ADD COLUMN amountCents INTEGER NOT NULL DEFAULT 0;
        UPDATE monthly_snapshot_items SET amountCents=CAST(ROUND(amount*100) AS INTEGER);
        PRAGMA user_version=2;
      `);
    });
  }
}
export const listAssets = (db:SQLiteDatabase) => db.getAllAsync<Asset>('SELECT * FROM assets ORDER BY name COLLATE NOCASE, id');
export async function saveAsset(db:SQLiteDatabase, input:AssetInput, id?:number) {
  if (!input.name.trim() || !input.unit.trim() || !Number.isFinite(input.quantity) || input.quantity < 0 ||
      !Number.isFinite(input.unitPrice) || input.unitPrice < 0 || !Number.isSafeInteger(input.amountCents) ||
      input.amountCents < 0 || input.amountCents > 100_000_000_000_000) throw new Error('資產輸入無效或金額過大');
  if (id !== undefined) {
    const old = await db.getFirstAsync<Asset>('SELECT * FROM assets WHERE id=?', id);
    if (old && old.unit !== input.unit) throw new Error('既有資產不能變更單位');
  }
  const now=new Date().toISOString();
  if (id !== undefined) {
    const result = await db.runAsync('UPDATE assets SET name=?,category=?,unit=?,quantity=?,unitPrice=?,amountCents=?,note=?,updatedAt=? WHERE id=?',
      input.name,input.category,input.unit,input.quantity,input.unitPrice,input.amountCents,input.note,now,id);
    if (!result.changes) throw new Error('此資產已不存在');
  } else {
    await db.runAsync('INSERT INTO assets (name,category,unit,quantity,unitPrice,amountCents,note,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)',
      input.name,input.category,input.unit,input.quantity,input.unitPrice,input.amountCents,input.note,now,now);
  }
}
export async function removeAsset(db:SQLiteDatabase,id:number) {
  await db.runAsync('DELETE FROM assets WHERE id=?',id);
}
export async function listSnapshots(db:SQLiteDatabase):Promise<SnapshotWithItems[]> {
  const [heads,details] = await Promise.all([
    db.getAllAsync<MonthlySnapshot>('SELECT * FROM monthly_snapshots ORDER BY yearMonth'),
    db.getAllAsync<SnapshotItem>('SELECT * FROM monthly_snapshot_items ORDER BY snapshotId,id')
  ]);
  const byId = new Map<number,SnapshotItem[]>();
  for(const item of details) {
    const values=byId.get(item.snapshotId)??[];
    values.push(item);byId.set(item.snapshotId,values);
  }
  return heads.map(s => ({...s,items:byId.get(s.id)??[]}));
}
export async function saveSnapshot(db:SQLiteDatabase,yearMonth:string,overwrite=false) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error('無效的年月');
  await db.withExclusiveTransactionAsync(async tx => {
    const existing = await tx.getFirstAsync<MonthlySnapshot>('SELECT * FROM monthly_snapshots WHERE yearMonth=?',yearMonth);
    if(existing && !overwrite) throw new Error('SNAPSHOT_EXISTS');
    const assets = await tx.getAllAsync<Asset>('SELECT * FROM assets');
    const totalCents = assets.reduce((sum,a)=>sum+a.amountCents,0);
    if (!Number.isSafeInteger(totalCents)) throw new Error('總資產金額超過安全範圍');
    const totalAmount = totalCents / 100;
    let id:number;
    if(existing) {
      id=existing.id;
      await tx.runAsync('DELETE FROM monthly_snapshot_items WHERE snapshotId=?',id);
      await tx.runAsync('UPDATE monthly_snapshots SET recordedAt=?,totalAmount=? WHERE id=?',new Date().toISOString(),totalAmount,id);
    } else {
      const result = await tx.runAsync('INSERT INTO monthly_snapshots(yearMonth,recordedAt,totalAmount) VALUES(?,?,?)',yearMonth,new Date().toISOString(),totalAmount);
      id=result.lastInsertRowId;
    }
    for(const a of assets) {
      await tx.runAsync('INSERT INTO monthly_snapshot_items(snapshotId,assetId,assetName,unit,quantity,unitPrice,amount,amountCents) VALUES(?,?,?,?,?,?,?,?)',
        id,a.id,a.name,a.unit,a.quantity,a.unitPrice,amountOf(a),a.amountCents);
    }
  });
}

export async function getAutoDay(db:SQLiteDatabase):Promise<number> {
  const row=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?','autoDay');
  return Number(row?.value ?? 0);
}
export async function setAutoDay(db:SQLiteDatabase,day:number) {
  if(!Number.isInteger(day)||day<0||day>28)throw new Error('日期須為1–28；0代表關閉');
  await db.runAsync('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value','autoDay',String(day));
}
// 只在當月達指定日時保存當下資料，不回填未曾觀測的過去月份。
export async function recordDueSnapshot(db:SQLiteDatabase,now=new Date()) {
  const day=await getAutoDay(db);
  if(!day||now.getDate()<day)return false;
  const month=localYearMonth(now);
  if(await db.getFirstAsync('SELECT id FROM monthly_snapshots WHERE yearMonth=?',month))return false;
  const count=await db.getFirstAsync<{n:number}>('SELECT COUNT(*) AS n FROM assets');
  if(!count?.n)return false;
  try {await saveSnapshot(db,month);return true;}
  catch(e){if(String(e).includes('SNAPSHOT_EXISTS'))return false;throw e;}
}
