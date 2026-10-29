# 📡 yt-alldaystream — 24/7 Live Text & Website Broadcaster

> Hostable on **GitHub Pages** or **Cloudflare Pages**: Broadcast live customizable text, news tickers, clocks, ambient audio, or any live website 24/7 to **YouTube Live ("Google Stream")**, **Cloudflare Stream**, or any **RTMP/WHIP** endpoint with your Stream ID / Key.

🌐 **Live GitHub Pages URL (once enabled):** [https://bhavyakumar-dev.github.io/yt-alldaystream/](https://bhavyakumar-dev.github.io/yt-alldaystream/)

---

## 🌟 Key Features

- **🌐 100% Static Web Application**: Zero backend required to run in the browser. Deploy directly to GitHub Pages or Cloudflare Pages.
- **📜 Dynamic Text & Marquee Studio**:
  - Live 1080p broadcast canvas (1920x1080 @ 30fps).
  - Custom headline, subtitle, announcement card, and continuous smooth scrolling ticker.
  - Real-time Local & UTC clocks.
  - 5 visual themes (Cyber Obsidian, Obsidian Gold, Matrix Emerald, Neon Sunset, Deep Studio) with ambient particle movement to keep video codecs happy.
- **🖥️ Stream Any Website or Tab**:
  - Toggle to **"Stream Any Website / Tab"** to capture another browser tab, live dashboard, or website URL in real-time with an optional broadcast overlay banner.
- **🎵 Built-In Audio Engine (Web Audio API)**:
  - *Silent Carrier Track*: YouTube and RTMP encoders immediately drop streams without audio. This generates an inaudible carrier track so your stream never fails.
  - *Generative Lo-Fi Ambient Synth*: Royalty-free, relaxing procedural ambient chord pads generated client-side with zero copyright claims.
  - *Microphone / Audio Line-In*: Stream your own microphone or system sound.
- **🛡️ 24/7 Keep-Alive & Anti-Throttling Suite**:
  - **Screen Wake Lock API**: Automatically prevents your monitor and operating system from entering sleep mode while broadcasting.
  - **Web Worker Ticker**: Bypasses browser tab throttling when the tab is minimized or in the background.
  - **Auto-reconnect**: Gracefully handles network drops.
  - **Uptime Counter**: Real-time timer tracking total broadcast duration.

---

## 🚀 Quick Deployment Guide

### Option A: GitHub Pages (Recommended)
1. In this repository, click **Settings** > **Pages** (under Code and automation).
2. Under **Build and deployment > Source**, select **GitHub Actions** (uses the included `.github/workflows/deploy.yml`) OR select **Deploy from a branch** > branch: `main` > folder: `/(root)` > **Save**.
3. Your site is live at:
   👉 **`https://bhavyakumar-dev.github.io/yt-alldaystream/`**

### Option B: Cloudflare Pages
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages > Create application > Pages**.
2. Select **Connect to Git** and choose `yt-alldaystream`.
3. Set **Build command** to empty and **Build output directory** to `/`.
4. Click **Save and Deploy**.

---

## 📺 How to Stream to YouTube Live ("Google Stream")

YouTube Live provides a **Stream Key / Stream ID** and an **RTMP Ingest URL** (`rtmp://a.rtmp.youtube.com/live2`). You have **4 flexible methods** to stream all day:

### Method 1: YouTube Studio Webcam Mode (Easiest — Zero Setup, 100% Free)
*No relays, no command line, no extra software needed!*
1. Go to [YouTube Studio Live](https://studio.youtube.com/channel/mine/livestreaming/webcam).
2. Create or select your live stream event.
3. Open your hosted [yt-alldaystream](https://bhavyakumar-dev.github.io/yt-alldaystream/) site in another tab, set your text/website, and click **"START 24/7 BROADCAST"**.
4. In YouTube Studio, click **Share Screen** > Select the **yt-alldaystream Browser Tab**.
5. Click **Go Live** on YouTube. YouTube Studio will stream your 1080p canvas and audio 24/7 directly!

---

### Method 2: Cloudflare Stream (Direct Serverless WebRTC WHIP)
*Cloudflare Stream supports native browser-to-cloud WebRTC ingestion (RFC 9321).*
1. In Cloudflare Dashboard, go to **Stream** > **Live Inputs** > **Create Live Input**.
2. Copy your **Live Input ID** and **WHIP Endpoint URL**.
3. In `yt-alldaystream`, select the **"Cloudflare Stream"** tab.
4. Paste your **Live Stream ID** and **WHIP Endpoint**.
5. Click **"START 24/7 BROADCAST"**. It connects directly to Cloudflare via WebRTC with zero intermediary servers!

---

### Method 3: Classic RTMP Stream Key (via Included 1-Command Relay)
*Browsers cannot open raw TCP RTMP connections directly due to security sandboxes. Use the included lightweight local relay:*
1. Make sure you have [FFmpeg](https://ffmpeg.org/download.html) installed.
2. Run either the Node.js or Python relay included in this repo:
   ```bash
   # Node.js:
   npm install ws
   node relay-server.js

   # OR Python:
   pip install websockets
   python relay-server.py
   ```
3. In `yt-alldaystream`, enter your YouTube **Stream Key** (`xxxx-xxxx-xxxx-xxxx-xxxx`) and set Relay to `ws://localhost:8080`.
4. Click **"START 24/7 BROADCAST"**.

---

### Method 4: 24/7 Headless Cloud Runner (Turn Off Your Computer!)
*A static website only runs code while a browser tab is open on a computer. If you want to turn off your computer and have it stream continuously 24/7 in the cloud for free, use the included Headless Cloud runner:*

#### Using GitHub Actions:
1. In your GitHub repository, go to **Settings > Secrets and variables > Actions**.
2. Add a repository secret named `YOUTUBE_STREAM_KEY` containing your YouTube Stream Key.
3. Click the **Actions** tab > **24/7 Cloud YouTube Streamer** > **Run workflow**.
4. Input your hosted GitHub Pages URL (`https://bhavyakumar-dev.github.io/yt-alldaystream/`) and run! GitHub spins up an Ubuntu cloud runner with Headless Chromium and FFmpeg to stream your site 24/7.

#### Using Docker (Render, Fly.io, Railway, or VPS):
```bash
cd headless-cloud
docker build -t yt-alldaystream-cloud .
docker run -d \
  -e PAGE_URL="https://bhavyakumar-dev.github.io/yt-alldaystream/" \
  -e YOUTUBE_STREAM_KEY="your-stream-key-here" \
  --name stream-247 yt-alldaystream-cloud
```

---

## ⚙️ Configuration & Controls

- **Fullscreen Preview**: Click `⛶ Fullscreen` or press `F` when canvas is focused.
- **Picture-in-Picture**: Click `🖼️ Picture-in-Picture` to inspect or route the video stream.
- **Save Settings**: Click `💾 Save Settings` in the Design tab to persist all titles, stream keys, and preferences in `localStorage`.

---

## 📄 License
MIT License.
