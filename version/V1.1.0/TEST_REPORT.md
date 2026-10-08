# v1.1.0 驗證報告

日期：2026-10-08。環境：Linux、Node.js v24.19.0。

| 檢查 | 結果與範圍 |
|---|---|
| npm install | 成功，已鎖定直接依賴版本並附 package-lock.json |
| npm ls --all | 成功，無無效 peer dependency／缺少依賴 |
| npm run check:offline | 10項 SDK 原生／React 依賴全部符合 Expo 57.0.27 bundledNativeModules.json |
| EXPO_OFFLINE=1 expo install --check | Dependencies are up to date；離線模式不查遠端 React Native Directory |
| npm run typecheck | strict TypeScript，全專案0錯誤 |
| npm test | 12項全部通過，使用真實 Node SQLite 引擎執行同一份 TypeScript 資料層 |
| Android bundle | Metro + Hermes 成功；1055 modules |
| iOS bundle | Metro + Hermes 成功；1079 modules |
| 實體手機／模擬器 Expo Go | 未執行，需依 README 手機驗收清單確認 |

最後打包命令：`npx expo export --platform android --platform ios --output-dir build-verified`。
重複匯出原 dist 時曾遇工作環境 ENOTEMPTY；使用新的輸出目錄後 Android／iOS 均成功。

線上 `expo install --check` 曾遇 HTTP Proxy timeout。因此相容性判定改用實際安裝 Expo 的內建版本表，並搭配 npm 全依賴樹檢查及雙平台 JS/Hermes bundle。未聲稱 expo-doctor 遠端目錄檢查通過，也未執行原生 Xcode／Gradle 商店建置。

## 12項功能測試

1. CRUD 與金額／數量獨立保存，同名不同 ID。
2. 快照不受改名、價格、數量、刪除影響；資產 ID 不重用。
3. 同月重複拒絕、確認覆寫與不同月份獨立。
4. 覆寫中途 SQL 失敗，原快照完整回滾。
5. 實體 SQLite 檔案關閉、重開及重跑 migration 保留資料。
6. 拒絕負數、NaN、不安全金額、空名稱、單位變更及不存在 ID。
7. 整數分合計、空資產手動快照。
8. 近12個月邊界與非法數字。
9. 自動快照指定日、空資料、只記一次、不補過去、關閉設定。
10. v1→v2 migration 分別保留舊資產與舊快照各自金額。
11. JSON備份還原保留資料、設定及已刪除 ID 上界。
12. 無效備份或還原SQL失敗不清除原資料。

測試中使用的黃金等數據僅在臨時測試 DB，應用啟動不載入假資料。

## 尚須手機確認

SQLite 原生橋接、分享／選檔面板、觸控圖表與水平捲動、键盤和安全區、冷啟動、作業系統版本、Expo Go SDK 版本。檢查成功不代表所有裝置均已驗證，備份是解除安裝與換機前必要操作。
