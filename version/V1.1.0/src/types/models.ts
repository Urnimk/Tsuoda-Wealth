export type AssetCategory = '股票' | 'ETF' | '黃金' | '現金' | '虛擬資產' | '其他';
export interface AssetInput {
  name: string;
  category: AssetCategory;
  unit: string;
  amountCents: number; // TWD 整數分；與數量獨立保存
  quantity: number;
  unitPrice: number;
  note: string;
}
export interface Asset extends AssetInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}
export interface MonthlySnapshot {
  id: number;
  yearMonth: string;
  recordedAt: string;
  totalAmount: number;
}
export interface SnapshotItem {
  id: number;
  snapshotId: number;
  assetId: number;
  assetName: string;
  unit: string;
  amountCents: number; // TWD 整數分；與數量獨立保存
  quantity: number;
  unitPrice: number;
  amount: number;
}
export interface SnapshotWithItems extends MonthlySnapshot {
  items: SnapshotItem[];
}
export type RangeFilter = 'all' | '12m';
export const assetCategories: AssetCategory[] = ['股票','ETF','黃金','現金','虛擬資產','其他'];
