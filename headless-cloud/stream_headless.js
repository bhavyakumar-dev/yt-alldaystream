/**
 * StreamCraft 24/7 — Headless Puppeteer + FFmpeg Cloud Streamer
 * 
 * Runs in headless Linux environments (Docker, GitHub Actions, VPS, Cloud VM)
 * Captures the web page and pushes continuous 1080p video + audio to YouTube RTMP.
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const PAGE_URL = process.env.PAGE_URL || 'https://careerwithenglish.pages.dev/';
const STREAM_KEY = process.env.YOUTUBE_STREAM_KEY;
const RTMP_URL = process.env.RTMP_URL || 'rtmp://a.rtmp.youtube.com/live2';
const DURATION_HOURS = parseFloat(process.env.DURATION_HOURS || '5.5');

if (!STREAM_KEY) {
  console.error("❌ ERROR: YOUTUBE_STREAM_KEY environment variable is required.");
  process.exit(1);
}

const targetRtmp = `${RTMP_URL}/${STREAM_KEY}`;
let isPlannedShutdown = false;
let ffmpegLogs = [];

async function run() {
  const currentDisplay = process.env.DISPLAY || ':99';
  console.log(`🖥️ Active X11 Display: ${currentDisplay}`);
  console.log(`🌐 Launching Kiosk Chromium for URL: ${PAGE_URL}`);

  // Launch Chromium in Fullscreen Kiosk Mode (1920x1080)
  const browser = await puppeteer.launch({
    headless: false, // Run in virtual X11 frame
    defaultViewport: null, // Allow window to fill full 1920x1080 screen
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--window-position=0,0',
      '--kiosk', // Pure fullscreen mode without browser chrome / url bar
      '--start-fullscreen',
      '--autoplay-policy=no-user-gesture-required',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log("⏳ Loading website content...");
  try {
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.readyState === 'complete');
  } catch (err) {
    console.warn("⚠️ Page load warning, proceeding anyway:", err.message);
  }

  // Ensure body is loaded and rendered
  try {
    await page.waitForSelector('body', { timeout: 10000 });
  } catch (e) {}

  // Allow 5 seconds for web fonts, stylesheets, and images to fully render
  console.log("⏳ Allowing 5s for page styles & fonts to paint...");
  await new Promise(r => setTimeout(r, 5000));

  // Inject smooth gentle auto-scroll so viewers see the full website moving dynamically
  console.log("📜 Initializing smooth auto-scrolling engine...");
  await page.evaluate(() => {
    let direction = 1;
    let pauseCounter = 0;

    setInterval(() => {
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;

      // Pause at the top or bottom for 4 seconds before reversing
      if (pauseCounter > 0) {
        pauseCounter--;
        return;
      }

      window.scrollBy({ top: 1.2 * direction, behavior: 'auto' });

      if (window.scrollY >= maxScroll - 4 && direction === 1) {
        direction = -1;
        pauseCounter = 100; // ~4 seconds pause at bottom
      } else if (window.scrollY <= 4 && direction === -1) {
        direction = 1;
        pauseCounter = 100; // ~4 seconds pause at top
      }
    }, 40);
  });

  // Determine correct X11 input for FFmpeg x11grab
  const x11Input = currentDisplay.includes('.') ? currentDisplay : `${currentDisplay}.0`;
  console.log(`🚀 Initializing FFmpeg capture from X11 display: ${x11Input}...`);

  const ffmpeg = spawn('ffmpeg', [
    // Video input from virtual X11 screen
    '-f', 'x11grab',
    '-video_size', '1920x1080',
    '-framerate', '30',
    '-draw_mouse', '0',
    '-i', x11Input,

    // Audio input: generate continuous silent audio carrier for YouTube encoder
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',

    // Video encoding settings (H.264 / CBR for YouTube Live)
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '3500k',
    '-maxrate', '3500k',
    '-bufsize', '7000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds

    // Audio encoding settings (AAC 128k stereo)
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',

    // Output format: FLV over RTMP
    '-f', 'flv',
    targetRtmp
  ]);

  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();
    ffmpegLogs.push(msg);
    if (ffmpegLogs.length > 80) ffmpegLogs.shift();

    if (msg.includes('fps=') || msg.includes('bitrate=')) {
      process.stdout.write(`\r📡 [Streaming Live] ${msg.trim()}`);
    } else if (msg.toLowerCase().includes('error') || msg.toLowerCase().includes('cannot') || msg.toLowerCase().includes('failed')) {
      console.error(`\n⚠️ [FFmpeg]: ${msg.trim()}`);
    }
  });

  ffmpeg.on('close', async (code) => {
    console.log(`\nFFmpeg process exited with code ${code} (planned: ${isPlannedShutdown})`);
    if (code !== 0 && !isPlannedShutdown) {
      console.error("❌ FFmpeg error logs:\n" + ffmpegLogs.join(''));
    }

    try {
      await browser.close();
    } catch (e) {}

    if (isPlannedShutdown) {
      process.exit(0);
    } else {
      process.exit(code === 0 ? 0 : (code || 1));
    }
  });

  // Scheduled shutdown slightly before GitHub Actions 6-hour limit
  const timeoutMs = Math.floor(DURATION_HOURS * 3600 * 1000);
  console.log(`⏳ Streaming scheduled for ${DURATION_HOURS} hour(s) (${Math.round(timeoutMs / 60000)} mins)...`);

  setTimeout(() => {
    console.log("\n⏰ Scheduled duration completed. Performing planned clean shutdown...");
    isPlannedShutdown = true;
    try {
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGINT');
    } catch (e) {
      process.exit(0);
    }
  }, timeoutMs);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
