# 資產雙視角 — Expo 第一版 v1.1.0

可編輯、多檔案 TypeScript 專案，四個底部分頁：金額總覽、數量總覽、金額歷史趨勢、數量歷史趨勢。啟動為空資料；不植入展示假資料。資料保存在手機 SQLite。

## 直接開始（Windows／macOS）

1. 安裝 Node.js **22.13 以上**（建議 Node 24 LTS）及 VS Code。
2. 解壓縮，以 VS Code 開啟內含 `package.json` 的 `asset-dual-view` 資料夾。
3. 終端機依序執行：

```bash
npm ci
npm run check:offline
npm run typecheck
npm test
npm start
```

4. 手機使用支援 **Expo SDK 57** 的 Expo Go，與電腦連上相同網路，掃描終端機 QR Code。
5. 若網路隔離，可嘗試 `npx expo start --tunnel`（需網路與額外 tunnel 套件）。

本專案針對 Android／iOS 的 Expo Go；不提供網頁版 SQLite 適配。若手機 Expo Go 提示 SDK 不符，請先確認其支援版本；不要任意升級 React Native。套件已固定版本並附 package-lock.json，請優先 `npm ci`，不要一開始執行全套件 upgrade。

## 1. 資料模型

完整 TypeScript：`src/types/models.ts`。

```ts
export interface AssetInput {
  name: string;
  category: AssetCategory;
  unit: string;
  amountCents: number; // TWD 整數分，與 quantity 獨立
  quantity: number;
  unitPrice: number; // 參考單價，只供使用者按鈕試算
  note: string;
}
export interface Asset extends AssetInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}
```

- 金額獨立輸入，整數分保存。例如黃金 7 g，金額 NT$5,000，並不強迫由參考價格推算。
- 編輯數量、參考單價不會自動改變金額；可按「數量 × 單價」填入，再儲存。
- `MonthlySnapshot` 保存月份、實際記錄時間、總額；`SnapshotItem` 保存當時名稱、單位、數量、參考單價與金額。
- 歷史明細不外鍵連結目前資產，所以改名、修改或刪除資產均不回寫歷史。
- 資產 ID 自動遞增，不因刪除而重用。同名資產仍為不同 ID。
- 同一資產的單位建立後不可改；需要換單位請新增資產。
- 數量使用 SQLite REAL，非無限精度；顯示最多六位小數。金額四捨五入到分，單項金額上限 NT$1兆。

## 2. SQLite 與狀態管理

- `src/database/database.ts`：初始化、user_version migration、資產 CRUD、快照、指定日設定。
- `src/database/backup.ts`：JSON 格式驗證、匯出與交易式還原。
- `src/context/AssetContext.tsx`：Context、單一序列佇列、重新載入、生命週期检查。

SQLite 啟用 WAL 與 foreign_keys。快照的表頭和明細一起交易提交；覆寫或還原中途失敗會整筆回滾。所有使用者值透過 SQL 綁定參數寫入。

原附件 v1 資料庫可原地升到 v2：目前金額由舊數量 × 單價回填，歷史金額由舊快照 amount 回填。較新資料庫版本會拒絕降版，不會清空。

## 3. 導覽與專案結構

```text
App.tsx                         SQLiteProvider／Context／Navigation 入口
index.ts                        Expo 入口註冊
src/
  types/models.ts               資料型別
  database/database.ts          SQLite CRUD／migration／月快照
  database/backup.ts            備份格式檢查／交易式還原
  context/AssetContext.tsx       狀態管理與序列操作
  navigation/AppNavigator.tsx   原生 Stack＋四個 Bottom Tabs
  screens/
    AmountScreen.tsx            金額總覽
    QuantityScreen.tsx          數量總覽
    AmountChartScreen.tsx       總額與動態多資產金額折線
    QuantityChartScreen.tsx     個別資產數量歷史
    AssetFormScreen.tsx         新增／編輯／刪除
    BackupScreen.tsx            備份／還原
  components/
    AssetRow.tsx                資產列表項
    TrendChart.tsx              Gifted Charts dataSet 多折線
    RangePicker.tsx             全部／近12個月
    AppErrorBoundary.tsx        啟動錯誤與重試
  theme/styles.ts               共用 StyleSheet
  utils/format.ts               格式、月份區間、金額計算
scripts/check-compatibility.cjs  對照已安裝 Expo 內建相容表
tests/database.test.cjs        真實 SQLite 整合測試（Node）
```

只有四個底部分頁；表單和備份是 Stack 子頁。

## 4. 四個可操作頁面

| 分頁 | 功能 |
|---|---|
| 金額總覽 | 即時加總已儲存金額、CRUD、進入備份頁 |
| 數量總覽 | 各資產持有量與自訂單位；點選編輯，不跨單位加總 |
| 金額歷史趨勢 | 總額折線、依資產 ID 動態建立多折線、點選隱藏、月份明細、手動與自動快照 |
| 數量歷史趨勢 | 選擇任一資產查看持有量，不受價格影響，已刪除資產仍可看歷史 |

圖表採 `react-native-gifted-charts` 的 `dataSet` API；可動態傳入任意數量序列，未使用固定 data/data2 五條上限模式。使用 SVG 與 Expo linear-gradient，搭配原生 StyleSheet。這是依功能與實際編譯驗證選型，沒有宣稱完成所有圖表庫的效能排名。

兩個歷史分頁皆支援「全部歷史／近12個月」，近12個月含當月與前11個曆月。未保存快照的月份不虛構資料；某已保存月份未持有的資產顯示0。折線連接實際快照，各點等距，月份有缺漏時請依標籤判讀。大量資產可隱藏部分線；同名資產請取可辨識名稱。持有量可能因賣出下降，並非只能向上成長。

## 快照規則

- 手動：金額歷史頁按「儲存本月快照」。同月已有資料會確認後覆寫。
- 自動：預設關閉，可設定每月1–28日。啟動、返回前景、前景每60秒檢查一次。
- 當月達指定日、有資產、尚無快照時保存；不覆寫既有快照。
- 例如設定每月5日，8日才開 App，記錄的是8日當下資料，recordedAt 顯示實際時間。
- App 關閉時不保證執行，也不補造從未記錄的過去月份。這不是手機背景常駐服務。
- 沒有市場行情 API；「即時總額」是目前已輸入資料的即時加總。

## 資料保護與備份

金額總覽 → 備份／還原 → 匯出 JSON → 在系統分享面板存至自己管理的位置。

還原會先驗證檔案，再顯示取代確認，最後在單一 SQLite 交易中恢復目前資產、全部歷史與指定日設定。無效檔或 SQL 失敗不應清除既有資料。JSON 未加密，請自行妥善保管。一般關閉、重啟 App 不會清除 SQLite；解除安裝、清除 App 資料或換機不在此保證內，務必先備份。此版無雲端同步。

## 驗證

```bash
npm run check:offline  # 對照安裝的 Expo SDK 相容性表，支援 Windows
npm run typecheck     # 全專案 strict TypeScript
npm test              # 12項真正 SQLite 測試
npm run export:mobile # Android、iOS Metro / Hermes bundle
npm run check         # Expo 線上相容性檢查（需可用網路）
```

詳見 `TEST_REPORT.md`。已實際安裝套件、完成型別檢查與手機 JS bundle；沒有在實體手機或模擬器操作 Expo Go，不能將 bundle 成功等同實機驗收或商店上架測試。SQLite 測試使用 Node 內建 SQLite 適配器執行本專案同一份資料層程式，非假資料 mock，但仍需手機驗收原生橋接、觸控、鍵盤與分享面板。

## 手機首次驗收

1. 黃金：7 g、參考單價3000、目前金額5000；0050：516股、目前金額10000，總額15000。
2. 存本月快照。改黃金數量為8、金額為6000：目前總額16000，原快照仍15000／7g。
3. 刪除黃金，歷史兩張圖仍顯示先前紀錄。
4. 手動覆寫本月時先取消，確認舊紀錄不變；再確認覆寫，應更新成目前持有情況。
5. 關閉 Expo Go 再開，確認資料仍在。匯出 JSON、修改資料、還原，確認恢復。
6. 自動日設為今天或更早，已有本月快照不能被自動覆寫。

## 維護

新增需求時優先修改對應模組。資料表變更必須新增 migration，不可直接刪資料庫；每次交付先跑型別與功能測試。package-lock.json 和原始碼一起保存／提交版本控制。不要將手機備份、node_modules、dist 放進原始碼版本庫。

參考：
- https://expo.dev/changelog/sdk-57
- https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/
- https://reactnavigation.org/docs/bottom-tab-navigator/
- https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts
