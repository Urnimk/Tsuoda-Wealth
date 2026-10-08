# 資料與維護邊界

1. 模型：`types/models.ts` 定義 AssetInput → Asset，以及 MonthlySnapshot → SnapshotItem。
2. 儲存：`database/database.ts` 管理 SQLite、migration、交易式快照；`backup.ts` 負責匯出／還原。
3. 狀態：`AssetContext` 將寫入、快照、自動檢查與備份串行化；每次寫入後讀回權威 SQLite 狀態。
4. 導覽：`AppNavigator` 提供四個底部分頁，表單與備份另走 Stack。
5. 頁面：只負責輸入、選擇、確認與呈現。圖表資料來自歷史明細，不從目前資產回算。

當前金額採 amountCents 整數分，數量與參考單價獨立。歷史明細保存當時完整值，以非外鍵 assetId 識別資產；删除目前資產不刪歷史。snapshotId 外鍵只管理一份快照內部明細。還原保留曾經使用的資產 ID 上界，避免歷史曲線與新資產混合。

修改資料表：建立下一個 user_version migration；新增對應升級測試；禁止以刪除 DB 代替 migration。

執行 `npm run check:offline`、`npm run typecheck`、`npm test`、`npm run export:mobile` 後，再於 Android／iOS Expo Go 驗收觸控、檔案分享與 SQLite 原生執行。
