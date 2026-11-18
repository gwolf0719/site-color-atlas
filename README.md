# 配色標本室

團隊設計網站或系統時，先開啟[公開色卡庫](https://gwolf0719.github.io/site-color-atlas/)。依用途與明暗篩選，點選色卡後切換官網或系統預覽。把「複製選色連結」貼回專案需求，再用「複製 CSS 變數」或 JSON 中同一個 id 的色值實作。

## 入口與維護

- `index.html` 與 `style.css` 提供公開介面、版型與參考來源。
- `palettes.json` 存放色卡 ID、名稱、用途、明暗、說明與八個色彩角色。團隊確認選色後可從 [JSON](https://gwolf0719.github.io/site-color-atlas/palettes.json) 依 ID 讀取。既有 ID 用於分享連結，請維持穩定。
- `app.js` 負責篩選、預覽、網址與 CSS 匯出。分享格式為 `?palette=risograph&view=system#preview`。
- 本機執行 `python3 -m http.server 8106 --bind 127.0.0.1`，並以瀏覽器開啟。發布來源為 GitHub Pages 的 main 分支根目錄。
- 執行 `python3 check.py` 及 `node --check app.js`，再以瀏覽器核對篩選、切換、複製與分享。

## 動態色環與 AI 配置表

首頁用 Three.js 顯示可選色塊。從 14 個主色色相起步，以主色家族、相鄰色相、對照色與前次選色推薦下一色，最多八色。後加入色的預設面積會隨順序與色差縮小。百分比欄可手動調整，其他色按比例重新分配，合計 100%。「複製整段給 AI」含字母、角色、HEX 與最終百分比。色環配色與下方 16 組預設色卡可各自分享。自由搭配的面積比例描述視覺構成，文字與底色仍需針對實際元件檢查。

- `mixer-data.mjs` 定義色相、推薦、比例計算與序列化；`mixer.js` 連接色環、配置表與分享網址。
- `ring.js` 產生立體色環、選色過渡、指標抬起與內圈面積顯示。減少動態偏好使用靜態角度，WebGL 不可用時改以可點選的平面色環。
- `vendor/three.js` 為 Three.js 0.187.0 的本機 ES module 精簡包，授權見 `vendor/three.LICENSE.txt`。
- 執行 `node --test mixer.test.mjs` 檢查推薦、比例與分享還原。
