# 健康追蹤 APP

記錄每日飲食與運動的 PWA 應用程式。

## 功能

- 記錄每日飲食（早餐/午餐/晚餐/點心）
- 記錄運動（類型、時長）
- 日曆歷史檢視
- 資料匯出/匯入（JSON 格式）
- 離線可用（PWA）
- 可安裝到手機主畫面

## 本地測試

在 health-tracker-app 資料夾中執行以下任一指令：

```bash
# 方法 1：使用 npx serve
npx serve -l 3000

# 方法 2：使用 Python
python -m http.server 3000

# 方法 3：使用 VS Code Live Server 擴充功能
# 在 VS Code 中安裝 Live Server，右鍵 index.html 選擇 "Open with Live Server"
```

然後在瀏覽器打開 http://localhost:3000

## 部署到網路（分享給朋友）

### 方法 1：Netlify Drop（最簡單，推薦）

1. 打開 https://app.netlify.com/drop
2. 把 `health-tracker-app` 整個資料夾拖進網頁
3. 等幾秒鐘就會得到一個網址，把網址分享給朋友即可
4. 免費，不需要帳號

### 方法 2：GitHub Pages

1. 在 GitHub 建立新的 repository
2. 把 health-tracker-app 裡的所有檔案上傳
3. 到 Settings > Pages，選擇 main 分支
4. 等幾分鐘就會得到 https://你的帳號.github.io/你的repo名稱/

### 方法 3：Vercel

1. 打開 https://vercel.com
2. 用 GitHub 帳號登入
3. 匯入 repository 或直接拖拽上傳
4. 自動部署並獲得網址

## 安裝到手機

部署完成後，用 Android 手機的 Chrome 瀏覽器打開網址：
1. 點右上角三個點 (⋮)
2. 選擇「加到主畫面」或「安裝應用程式」
3. APP 圖示就會出現在手機主畫面上

## 技術

- 純 HTML / CSS / JavaScript（無框架）
- PWA（Service Worker + Web App Manifest）
- localStorage 本地儲存
