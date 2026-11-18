# 配色標本室

打開[配色標本室](https://gwolf0719.github.io/site-color-atlas/)，點選 Three.js 色環上的主色，切換協調或鮮明高反差，再選背景與輔助色。下方配置表可改角色和百分比，整段複製給 AI，或用網址分享同一組配色。

## 入口與維護

- `index.html` 與 `style.css` 提供公開介面、版型與參考來源。
- `palettes.json` 存放色卡 ID、名稱、用途、明暗、說明與八個色彩角色。團隊確認選色後可從 [JSON](https://gwolf0719.github.io/site-color-atlas/palettes.json) 依 ID 讀取。既有 ID 用於分享連結，請維持穩定。
- `app.js` 負責篩選、預覽、網址與 CSS 匯出。分享格式為 `?palette=risograph&view=system#preview`。
- 本機執行 `python3 -m http.server 8106 --bind 127.0.0.1`，並以瀏覽器開啟。發布來源為 GitHub Pages 的 main 分支根目錄。
- 執行 `python3 check.py` 及 `node --check app.js`，再以瀏覽器核對篩選、切換、複製與分享。

## 動態色環與 AI 配置表

首頁用 Three.js 顯示可選色塊。以 48 個色相、6 階明度與 4 階彩度構成色環，經色域篩選保留 1,095 個色階。可直接輸入指定 HEX，或在挑選時瀏覽全色環。每次依主色與上次選色最多提供 72 個候選，每批 12 色。高反差方向依對比門檻決定實際候選數。每份配置表最多八色。後加入色的預設面積會隨順序與色差縮小。百分比欄可手動調整，其他色按比例重新分配，合計 100%。「複製整段給 AI」含字母、角色、HEX 與最終百分比。色環配色與下方 64 組預設色卡可各自分享。自由搭配的面積比例描述視覺構成，文字與底色仍需針對實際元件檢查。

- `spectrum.mjs` 定義分層色環、色碼審核與配色推薦。
- `mixer-data.mjs` 定義比例計算與序列化；`mixer.js` 連接色環、配置表與分享網址。
- `ring.js` 產生立體色環、選色過渡、指標抬起與內圈面積顯示。減少動態偏好使用靜態角度，WebGL 不可用時改以可點選的平面色環。
- `vendor/three.js` 為 Three.js 0.187.0 的本機 ES module 精簡包，授權見 `vendor/three.LICENSE.txt`。
- 執行 `node --test mixer.test.mjs` 檢查推薦、比例與分享還原。

## 來源與選色規則

Color Hunt 公開最新動態在 2026-11-18 依序讀取 108 個非空分頁，下一頁回傳空陣列。快照存放於 `colorhunt.json`，共 4,303 組、14,489 個不重複 HEX，保留原卡順序；此版可直接套用 989 組符合團隊篩選條件的色卡。每組均連回 [Color Hunt](https://colorhunt.co/) 原頁。外部色卡、團隊網站色卡、色環可各自選取使用。

參考 [Paletton](https://paletton.com/) 的色相關係。本站以 HSL 計算鄰近、互補及分裂互補角度，配合相對亮度排序推薦。鮮明高反差推薦的單色與主色至少 3∶1，實際作為一般文字時另檢查 4.5∶1。Color Hunt 列表以實際色卡搭配與選色方向排序。每色可指派背景、主色、輔助色或其他，調整後可分享或複製給 AI。

- `hunt.js` 讀公開快照、過濾色域、排列原卡並帶入試色。快照為當日資料。
- `color-rules.mjs` 對應色彩角色、挑選預覽文字色與顯示對比。

## 動態首頁

滿版 Three.js 場景使用同一個 WebGLRenderer 繪製流動背景與立體折面色片。進場時色片分段聚合，指標會抬起目前色片，選色後場景依最新色碼染色，滾動會改變色輪傾角。精準輸入收在可展開的選色工具，配置表接在場景下方。減少動態偏好關閉連續渲染；離開場景時會暫停繪製。

- `chromatic-scene.js` 產生扭轉色片網格與背景材質。
- `ring.js` 負責共用畫布、色環點選與動畫時序，`exhibition.css` 定義沉浸首頁與手機編排。

首頁保留動態色環、底色與 AI 配置表。[參考色庫](https://gwolf0719.github.io/site-color-atlas/library.html) 集中 Color Hunt、團隊色卡與使用來源。首頁九階灰色可設為底色或加入配色，自訂底色套用到 WebGL 場景與配置表，分享網址也保留背景角色。
