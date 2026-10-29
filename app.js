// ==========================================================================
// StreamCraft 24/7 Main Application Controller
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const streamCanvas = document.getElementById('streamCanvas');
  const screenCaptureVideo = document.getElementById('screenCaptureVideo');
  const toggleStreamBtn = document.getElementById('toggleStreamBtn');
  const streamBtnText = document.getElementById('streamBtnText');
  const liveIndicator = document.getElementById('liveIndicator');
  const broadcastDot = document.getElementById('broadcastDot');
  const broadcastText = document.getElementById('broadcastText');
  const uptimeDisplay = document.getElementById('uptimeDisplay');
  const wakeLockDot = document.getElementById('wakeLockDot');
  const wakeLockText = document.getElementById('wakeLockText');
  const toggleWakeLockBtn = document.getElementById('toggleWakeLockBtn');
  const pipBtn = document.getElementById('pipBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  // Input Elements
  const streamTitleInput = document.getElementById('streamTitle');
  const streamSubtitleInput = document.getElementById('streamSubtitle');
  const noticeBoxInput = document.getElementById('noticeBox');
  const tickerTextInput = document.getElementById('tickerText');
  const tickerSpeedInput = document.getElementById('tickerSpeed');
  const tickerSpeedVal = document.getElementById('tickerSpeedVal');
  const clockFormatSelect = document.getElementById('clockFormat');
  const resolutionSelect = document.getElementById('resolutionSelect');
  const frameRateSelect = document.getElementById('frameRateSelect');

  // Tabs & Platforms
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const platformPills = document.querySelectorAll('.platform-pill');
  const youtubeConfig = document.getElementById('youtubeConfig');
  const cloudflareConfig = document.getElementById('cloudflareConfig');
  const customWhipConfig = document.getElementById('customWhipConfig');

  // Stream IDs & Keys
  const ytStreamKey = document.getElementById('ytStreamKey');
  const ytRtmpUrl = document.getElementById('ytRtmpUrl');
  const ytRelayUrl = document.getElementById('ytRelayUrl');
  const cfStreamId = document.getElementById('cfStreamId');
  const cfWhipUrl = document.getElementById('cfWhipUrl');
  const cfAuthToken = document.getElementById('cfAuthToken');
  const customWhipEndpoint = document.getElementById('customWhipEndpoint');
  const customWhipBearer = document.getElementById('customWhipBearer');
  const toggleKeyVis = document.getElementById('toggleKeyVis');

  // Audio Elements
  const audioVolume = document.getElementById('audioVolume');
  const volumeVal = document.getElementById('volumeVal');
  const vuBar = document.getElementById('vuBar');
  const audioStat = document.getElementById('audioStat');
  const targetStat = document.getElementById('targetStat');

  // Screen Capture Controls
  const startCaptureBtn = document.getElementById('startCaptureBtn');
  const websiteCaptureControls = document.getElementById('websiteCaptureControls');
  const textContentControls = document.getElementById('textContentControls');
  const showOverlayOnWebsite = document.getElementById('showOverlayOnWebsite');

  // Themes & Effects
  const themeButtons = document.querySelectorAll('.theme-btn');
  const enableParticles = document.getElementById('enableParticles');
  const enableGlow = document.getElementById('enableGlow');

  // State
  let currentPlatform = 'youtube';
  let wakeLock = null;
  let worker = null;
  let displayMediaStream = null;

  // Initialize Engines
  const audioEngine = new window.AudioEngine();
  const canvasRenderer = new window.CanvasRenderer(streamCanvas, screenCaptureVideo);
  const streamer = new window.UniversalStreamer(streamCanvas, screenCaptureVideo, audioEngine);

  // --------------------------------------------------------------------------
  // Tab Switching
  // --------------------------------------------------------------------------
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetPane = document.getElementById(btn.dataset.tab);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // --------------------------------------------------------------------------
  // Platform Switching
  // --------------------------------------------------------------------------
  platformPills.forEach(pill => {
    pill.addEventListener('click', () => {
      platformPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentPlatform = pill.dataset.platform;

      youtubeConfig.style.display = currentPlatform === 'youtube' ? 'block' : 'none';
      cloudflareConfig.style.display = currentPlatform === 'cloudflare' ? 'block' : 'none';
      customWhipConfig.style.display = currentPlatform === 'custom-whip' ? 'block' : 'none';

      targetStat.textContent = currentPlatform === 'youtube' ? 'YouTube Live' :
                               currentPlatform === 'cloudflare' ? 'Cloudflare Stream' : 'Custom WHIP';
    });
  });

  // Toggle Stream Key Visibility
  toggleKeyVis.addEventListener('click', () => {
    if (ytStreamKey.type === 'password') {
      ytStreamKey.type = 'text';
      toggleKeyVis.textContent = '🔒';
    } else {
      ytStreamKey.type = 'password';
      toggleKeyVis.textContent = '👁️';
    }
  });

  // --------------------------------------------------------------------------
  // Video Source Radio (Text Studio vs Website/Screen Capture)
  // --------------------------------------------------------------------------
  const videoSourceRadios = document.querySelectorAll('input[name="videoSourceMode"]');
  videoSourceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      canvasRenderer.mode = mode;
      if (mode === 'website') {
        websiteCaptureControls.style.display = 'block';
      } else {
        websiteCaptureControls.style.display = 'none';
      }
    });
  });

  // Start Screen / Tab Capture for streaming another website
  startCaptureBtn.addEventListener('click', async () => {
    try {
      if (displayMediaStream) {
        displayMediaStream.getTracks().forEach(t => t.stop());
      }

      displayMediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      screenCaptureVideo.srcObject = displayMediaStream;
      await screenCaptureVideo.play();
      startCaptureBtn.textContent = '✅ Tab / Website Connected! (Click to Change)';
      startCaptureBtn.classList.remove('btn-accent');
      startCaptureBtn.classList.add('btn-secondary');

      displayMediaStream.getVideoTracks()[0].onended = () => {
        canvasRenderer.mode = 'text';
        document.querySelector('input[name="videoSourceMode"][value="text"]').checked = true;
        websiteCaptureControls.style.display = 'none';
        startCaptureBtn.textContent = '🖥️ Choose Browser Tab / Website to Stream';
      };
    } catch (err) {
      console.warn("Screen capture cancelled or failed:", err);
    }
  });

  showOverlayOnWebsite.addEventListener('change', (e) => {
    canvasRenderer.showOverlayOnWebsite = e.target.checked;
  });

  // --------------------------------------------------------------------------
  // Content Inputs Sync
  // --------------------------------------------------------------------------
  streamTitleInput.addEventListener('input', (e) => canvasRenderer.title = e.target.value);
  streamSubtitleInput.addEventListener('input', (e) => canvasRenderer.subtitle = e.target.value);
  noticeBoxInput.addEventListener('input', (e) => canvasRenderer.notice = e.target.value);
  tickerTextInput.addEventListener('input', (e) => canvasRenderer.tickerText = e.target.value);
  tickerSpeedInput.addEventListener('input', (e) => {
    canvasRenderer.tickerSpeed = parseInt(e.target.value, 10);
    tickerSpeedVal.textContent = e.target.value;
  });
  clockFormatSelect.addEventListener('change', (e) => canvasRenderer.clockFormat = e.target.value);

  // Resolution & FPS
  resolutionSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    let w = 1920, h = 1080;
    if (val === '720p') { w = 1280; h = 720; }
    else if (val === '480p') { w = 854; h = 480; }
    canvasRenderer.setResolution(w, h);
    document.getElementById('resolutionTag').textContent = `${val} ${frameRateSelect.value}fps`;
  });

  frameRateSelect.addEventListener('change', (e) => {
    const fps = parseInt(e.target.value, 10);
    streamer.fps = fps;
    document.getElementById('fpsStat').textContent = fps;
    document.getElementById('resolutionTag').textContent = `${resolutionSelect.value} ${fps}fps`;
    if (worker) {
      worker.postMessage({ action: 'setFps', fps: fps });
    }
  });

  // --------------------------------------------------------------------------
  // Audio Controls
  // --------------------------------------------------------------------------
  const audioSourceRadios = document.querySelectorAll('input[name="audioSourceMode"]');
  audioSourceRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const mode = e.target.value;
      await audioEngine.setMode(mode);
      audioStat.textContent = mode === 'silent' ? 'Silent Carrier' :
                              mode === 'lofi' ? 'Lo-Fi Ambient Synth' : 'Microphone In';
    });
  });

  audioVolume.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10) / 100;
    audioEngine.setVolume(vol);
    volumeVal.textContent = `${e.target.value}%`;
  });

  // VU Meter Loop
  setInterval(() => {
    const level = audioEngine.getLevel();
    vuBar.style.width = `${Math.max(4, level)}%`;
  }, 100);

  // --------------------------------------------------------------------------
  // Themes & Effects
  // --------------------------------------------------------------------------
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvasRenderer.theme = btn.dataset.theme;
    });
  });

  enableParticles.addEventListener('change', (e) => canvasRenderer.enableParticles = e.target.checked);
  enableGlow.addEventListener('change', (e) => canvasRenderer.enableGlow = e.target.checked);

  // --------------------------------------------------------------------------
  // Web Worker Ticker (Prevents Background Tab Throttling)
  // --------------------------------------------------------------------------
  function initWebWorker() {
    try {
      worker = new Worker('worker.js');
      worker.postMessage({ action: 'start', fps: 30 });
      worker.onmessage = (e) => {
        if (e.data.type === 'tick') {
          // Render frame on worker tick to ensure 30fps even when tab is backgrounded
          canvasRenderer.render();
        }
      };
    } catch (err) {
      console.warn("Worker could not be started, falling back to requestAnimationFrame:", err);
      // Fallback standard rAF render loop
      function loop() {
        canvasRenderer.render();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    }
  }
  initWebWorker();

  // --------------------------------------------------------------------------
  // Screen Wake Lock API (Prevents PC / Screen from Sleeping)
  // --------------------------------------------------------------------------
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLockDot.className = 'status-dot active';
        wakeLockText.textContent = 'Active (24/7 Awake)';
        toggleWakeLockBtn.innerHTML = '<span class="btn-icon">☀️</span> Screen Awake Active';
        wakeLock.addEventListener('release', () => {
          wakeLockDot.className = 'status-dot warning';
          wakeLockText.textContent = 'Inactive';
          toggleWakeLockBtn.innerHTML = '<span class="btn-icon">☕</span> Keep Tab Awake';
          wakeLock = null;
        });
      } catch (err) {
        console.warn("WakeLock request failed:", err);
      }
    } else {
      wakeLockText.textContent = 'Unsupported by Browser';
    }
  }

  function releaseWakeLock() {
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
    }
  }

  toggleWakeLockBtn.addEventListener('click', () => {
    if (wakeLock) {
      releaseWakeLock();
    } else {
      requestWakeLock();
    }
  });

  // Auto re-acquire wake lock if user switches back to tab
  document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
      await requestWakeLock();
    }
  });

  // --------------------------------------------------------------------------
  // Streamer Callbacks & UI Sync
  // --------------------------------------------------------------------------
  streamer.onStatusChange = ({ state, message }) => {
    broadcastText.textContent = message;
    if (state === 'live') {
      liveIndicator.className = 'live-pill is-live';
      liveIndicator.textContent = '● LIVE';
      broadcastDot.className = 'status-dot live';
      toggleStreamBtn.classList.add('is-broadcasting');
      streamBtnText.textContent = 'STOP BROADCAST';
    } else if (state === 'connecting') {
      liveIndicator.className = 'live-pill';
      liveIndicator.textContent = '● CONNECTING';
      broadcastDot.className = 'status-dot warning';
    } else {
      liveIndicator.className = 'live-pill';
      liveIndicator.textContent = '● OFFLINE';
      broadcastDot.className = 'status-dot offline';
      toggleStreamBtn.classList.remove('is-broadcasting');
      streamBtnText.textContent = 'START 24/7 BROADCAST';
    }
  };

  streamer.onUptimeUpdate = (formattedTime) => {
    uptimeDisplay.textContent = `⏱️ ${formattedTime}`;
  };

  streamer.onError = (err) => {
    alert(`Broadcast Error: ${err.message}`);
  };

  // --------------------------------------------------------------------------
  // Master Broadcast Toggle Button
  // --------------------------------------------------------------------------
  toggleStreamBtn.addEventListener('click', async () => {
    if (streamer.isStreaming) {
      streamer.stopBroadcast();
      releaseWakeLock();
    } else {
      // Build configuration
      const config = {
        target: currentPlatform,
        fps: parseInt(frameRateSelect.value, 10),
        resolution: resolutionSelect.value
      };

      if (currentPlatform === 'youtube') {
        config.streamKey = ytStreamKey.value.trim();
        config.rtmpUrl = ytRtmpUrl.value.trim();
        config.relayUrl = ytRelayUrl.value.trim();
        // Check if user is using local relay or native YouTube Studio Webcam mode
        config.useRelay = !!config.streamKey && ytRelayUrl.value.includes('ws');
      } else if (currentPlatform === 'cloudflare') {
        config.streamId = cfStreamId.value.trim();
        config.whipUrl = cfWhipUrl.value.trim();
        config.authToken = cfAuthToken.value.trim();
      } else if (currentPlatform === 'custom-whip') {
        config.whipUrl = customWhipEndpoint.value.trim();
        config.authToken = customWhipBearer.value.trim();
      }

      try {
        await streamer.startBroadcast(config);
        // Automatically activate screen wake lock when stream starts
        await requestWakeLock();
      } catch (err) {
        console.error("Failed to start stream:", err);
      }
    }
  });

  // Picture in Picture
  pipBtn.addEventListener('click', async () => {
    try {
      await streamer.requestPictureInPicture();
    } catch (e) {
      alert("Picture-in-Picture error: " + e.message);
    }
  });

  // Fullscreen
  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      streamCanvas.requestFullscreen().catch(err => {
        alert("Fullscreen request failed: " + err.message);
      });
    }
  });

  // --------------------------------------------------------------------------
  // Save / Restore Configuration (LocalStorage)
  // --------------------------------------------------------------------------
  const saveConfigBtn = document.getElementById('saveConfigBtn');
  const resetConfigBtn = document.getElementById('resetConfigBtn');

  function saveConfig() {
    const config = {
      title: streamTitleInput.value,
      subtitle: streamSubtitleInput.value,
      notice: noticeBoxInput.value,
      tickerText: tickerTextInput.value,
      tickerSpeed: tickerSpeedInput.value,
      clockFormat: clockFormatSelect.value,
      theme: canvasRenderer.theme,
      currentPlatform: currentPlatform,
      ytStreamKey: ytStreamKey.value,
      ytRelayUrl: ytRelayUrl.value,
      cfStreamId: cfStreamId.value,
      cfWhipUrl: cfWhipUrl.value,
      cfAuthToken: cfAuthToken.value,
      customWhipEndpoint: customWhipEndpoint.value,
      customWhipBearer: customWhipBearer.value,
      resolution: resolutionSelect.value,
      fps: frameRateSelect.value
    };
    localStorage.setItem('streamcraft_config', JSON.stringify(config));
    alert("✅ Configuration saved! Settings will automatically load next time.");
  }

  function loadConfig() {
    try {
      const saved = localStorage.getItem('streamcraft_config');
      if (!saved) return;
      const c = JSON.parse(saved);

      if (c.title) { streamTitleInput.value = c.title; canvasRenderer.title = c.title; }
      if (c.subtitle) { streamSubtitleInput.value = c.subtitle; canvasRenderer.subtitle = c.subtitle; }
      if (c.notice) { noticeBoxInput.value = c.notice; canvasRenderer.notice = c.notice; }
      if (c.tickerText) { tickerTextInput.value = c.tickerText; canvasRenderer.tickerText = c.tickerText; }
      if (c.tickerSpeed) {
        tickerSpeedInput.value = c.tickerSpeed;
        canvasRenderer.tickerSpeed = parseInt(c.tickerSpeed, 10);
        tickerSpeedVal.textContent = c.tickerSpeed;
      }
      if (c.clockFormat) { clockFormatSelect.value = c.clockFormat; canvasRenderer.clockFormat = c.clockFormat; }
      if (c.theme) {
        canvasRenderer.theme = c.theme;
        themeButtons.forEach(b => {
          b.classList.toggle('active', b.dataset.theme === c.theme);
        });
      }
      if (c.ytStreamKey) ytStreamKey.value = c.ytStreamKey;
      if (c.ytRelayUrl) ytRelayUrl.value = c.ytRelayUrl;
      if (c.cfStreamId) cfStreamId.value = c.cfStreamId;
      if (c.cfWhipUrl) cfWhipUrl.value = c.cfWhipUrl;
      if (c.cfAuthToken) cfAuthToken.value = c.cfAuthToken;
      if (c.customWhipEndpoint) customWhipEndpoint.value = c.customWhipEndpoint;
      if (c.customWhipBearer) customWhipBearer.value = c.customWhipBearer;
    } catch (e) {
      console.warn("Could not load saved config:", e);
    }
  }

  saveConfigBtn.addEventListener('click', saveConfig);
  resetConfigBtn.addEventListener('click', () => {
    if (confirm("Reset all settings to default values?")) {
      localStorage.removeItem('streamcraft_config');
      window.location.reload();
    }
  });

  // Load saved config on startup
  loadConfig();
});
