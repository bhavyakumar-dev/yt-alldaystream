/**
 * StreamCraft 24/7 — Headless Puppeteer + FFmpeg Cloud Streamer
 * 
 * Runs in headless Linux environments (Docker, GitHub Actions, VPS, Cloud VM)
 * Captures the web page and pushes continuous 1080p video + audio to YouTube RTMP.
 */

const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

const PAGE_URL = process.env.PAGE_URL || 'http://localhost:8080';
const STREAM_KEY = process.env.YOUTUBE_STREAM_KEY;
const RTMP_URL = process.env.RTMP_URL || 'rtmp://a.rtmp.youtube.com/live2';
const DURATION_HOURS = parseFloat(process.env.DURATION_HOURS || '6');

if (!STREAM_KEY) {
  console.error("❌ ERROR: YOUTUBE_STREAM_KEY environment variable is required.");
  process.exit(1);
}

const targetRtmp = `${RTMP_URL}/${STREAM_KEY}`;

async function run() {
  console.log(`🌐 Launching Headless Chromium for URL: ${PAGE_URL}`);

  const browser = await puppeteer.launch({
    headless: false, // Run in virtual X11 frame
    defaultViewport: { width: 1920, height: 1080 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--start-fullscreen',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });

  // Optional: trigger full-screen / clean view if available
  await page.evaluate(() => {
    // If running StreamCraft UI, automatically click fullscreen or clean preview
    const canvas = document.getElementById('streamCanvas');
    if (canvas && canvas.requestFullscreen) {
      // already 1920x1080 viewport
    }
  });

  console.log("🚀 Initializing FFmpeg capture from X11 display :0.0...");

  const ffmpeg = spawn('ffmpeg', [
    // Video input from virtual X11 screen
    '-f', 'x11grab',
    '-video_size', '1920x1080',
    '-framerate', '30',
    '-i', ':0.0+0,0',

    // Audio input: generate continuous silent audio carrier for YouTube encoder
    '-f', 'lavfi',
    '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',

    // Video encoding settings
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-maxrate', '3500k',
    '-bufsize', '7000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds

    // Audio encoding settings
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',

    // Output format: FLV over RTMP
    '-f', 'flv',
    targetRtmp
  ]);

  ffmpeg.stderr.on('data', (data) => {
    // Print progress lines
    const msg = data.toString();
    if (msg.includes('fps=') || msg.includes('bitrate=')) {
      process.stdout.write(`\r📡 [Streaming] ${msg.trim()}`);
    }
  });

  ffmpeg.on('close', (code) => {
    console.log(`\nFFmpeg exited with code ${code}`);
    browser.close();
    process.exit(code || 0);
  });

  // Run for requested duration
  const timeoutMs = DURATION_HOURS * 3600 * 1000;
  console.log(`⏳ Streaming scheduled for ${DURATION_HOURS} hour(s)...`);

  setTimeout(() => {
    console.log("\n⏰ Scheduled duration completed. Shutting down stream cleanly...");
    ffmpeg.stdin.end();
    ffmpeg.kill('SIGINT');
  }, timeoutMs);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
