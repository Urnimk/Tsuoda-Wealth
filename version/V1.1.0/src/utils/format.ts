import type { Asset, RangeFilter, SnapshotWithItems } from '../types/models';
export const roundMoney = (v:number) => Math.round((v + Number.EPSILON) * 100) / 100;
export const amountOf = (asset: Pick<Asset,'amountCents'>) => asset.amountCents / 100;
export const money = (v:number) => `NT$ ${new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(v)}`;
export const numberText = (v:number) => new Intl.NumberFormat('zh-TW',{maximumFractionDigits:6}).format(v);
export const localYearMonth = (date:Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
export const rangeSnapshots = (records:SnapshotWithItems[],range:RangeFilter, now=new Date()) => {
  const cutoff = localYearMonth(new Date(now.getFullYear(),now.getMonth()-11,1));
  return [...records].filter(s => range==='all' || (s.yearMonth>=cutoff && s.yearMonth<=localYearMonth(now))).sort((a,b)=>a.yearMonth.localeCompare(b.yearMonth));
};
export const validNumber = (input:string) => {
  if (!/^\d+(\.\d+)?$/.test(input.trim())) return null;
  const v = Number(input);
  return Number.isFinite(v) && v >= 0 ? v : null;
};
