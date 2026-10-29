// ==========================================================================
// StreamCraft 24/7 Canvas Rendering Engine
// ==========================================================================
// Renders 1080p studio visual feed with text, clock, ticker, themes, and screen captures.

class CanvasRenderer {
  constructor(canvasElement, screenVideoElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.video = screenVideoElement;

    this.width = 1920;
    this.height = 1080;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // State & Options
    this.mode = 'text'; // 'text' or 'website'
    this.title = '24/7 LIVE STREAM BROADCAST';
    this.subtitle = 'Streaming Live All Day • Powered by StreamCraft';
    this.notice = 'Welcome to our 24/7 continuous broadcast.\nUpdates, live status, and news are automatically synced here.\nLeave a comment in chat and subscribe for daily updates!';
    this.tickerText = '🚨 BREAKING: 24/7 Live Stream is running smoothly • Stay tuned for live updates • Don\'t forget to like and subscribe • Powered by GitHub / Cloudflare Pages 🚨';
    this.tickerSpeed = 3;
    this.clockFormat = 'both'; // 'both', 'local', 'utc', 'none'
    this.theme = 'cyberpunk';
    this.enableParticles = true;
    this.enableGlow = true;
    this.showOverlayOnWebsite = true;

    // Ticker offset
    this.tickerOffset = 0;

    // Particle system (ambient movement so video codecs don't drop frozen frames)
    this.particles = [];
    this.initParticles();

    // Theme color schemes
    this.themes = {
      cyberpunk: {
        bgStart: '#070b14',
        bgEnd: '#0f172a',
        accent: '#06b6d4',
        accentGlow: 'rgba(6, 182, 212, 0.4)',
        cardBg: 'rgba(15, 23, 42, 0.75)',
        textMain: '#ffffff',
        textSub: '#94a3b8',
        tickerBg: 'rgba(6, 182, 212, 0.15)',
        tickerBorder: '#06b6d4'
      },
      gold: {
        bgStart: '#14100c',
        bgEnd: '#261b11',
        accent: '#f59e0b',
        accentGlow: 'rgba(245, 158, 11, 0.4)',
        cardBg: 'rgba(38, 27, 17, 0.75)',
        textMain: '#ffffff',
        textSub: '#d97706',
        tickerBg: 'rgba(245, 158, 11, 0.15)',
        tickerBorder: '#f59e0b'
      },
      emerald: {
        bgStart: '#04130e',
        bgEnd: '#09251c',
        accent: '#10b981',
        accentGlow: 'rgba(16, 185, 129, 0.4)',
        cardBg: 'rgba(9, 37, 28, 0.75)',
        textMain: '#ffffff',
        textSub: '#6ee7b7',
        tickerBg: 'rgba(16, 185, 129, 0.15)',
        tickerBorder: '#10b981'
      },
      sunset: {
        bgStart: '#170919',
        bgEnd: '#2c122b',
        accent: '#f43f5e',
        accentGlow: 'rgba(244, 63, 94, 0.4)',
        cardBg: 'rgba(44, 18, 43, 0.75)',
        textMain: '#ffffff',
        textSub: '#fda4af',
        tickerBg: 'rgba(244, 63, 94, 0.15)',
        tickerBorder: '#f43f5e'
      },
      studio: {
        bgStart: '#0d1117',
        bgEnd: '#161b22',
        accent: '#3b82f6',
        accentGlow: 'rgba(59, 130, 246, 0.4)',
        cardBg: 'rgba(22, 27, 34, 0.75)',
        textMain: '#ffffff',
        textSub: '#93c5fd',
        tickerBg: 'rgba(59, 130, 246, 0.15)',
        tickerBorder: '#3b82f6'
      }
    };
  }

  setResolution(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1.5 + Math.random() * 3.5,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.8,
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  render() {
    const t = this.themes[this.theme] || this.themes.cyberpunk;

    if (this.mode === 'website' && this.video.readyState >= 2) {
      this.renderWebsiteMode(t);
    } else {
      this.renderTextStudioMode(t);
    }
  }

  renderWebsiteMode(t) {
    // Draw captured video (tab/website) stretched/contained to 1920x1080
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const vWidth = this.video.videoWidth || this.width;
    const vHeight = this.video.videoHeight || this.height;

    // Scale to fit canvas
    const scale = Math.min(this.width / vWidth, this.height / vHeight);
    const drawW = vWidth * scale;
    const drawH = vHeight * scale;
    const drawX = (this.width - drawW) / 2;
    const drawY = (this.height - drawH) / 2;

    this.ctx.drawImage(this.video, drawX, drawY, drawW, drawH);

    // Optional overlay banners
    if (this.showOverlayOnWebsite) {
      this.drawTopBar(t);
      this.drawScrollingTicker(t);
    }
  }

  renderTextStudioMode(t) {
    // Background gradient
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, t.bgStart);
    grad.addColorStop(1, t.bgEnd);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Ambient floating particles
    if (this.enableParticles) {
      this.drawParticles(t);
    }

    // Top Header & Navigation Bar
    this.drawTopBar(t);

    // Center Message Card
    this.drawCentralCard(t);

    // Bottom Scrolling Ticker / Marquee
    this.drawScrollingTicker(t);
  }

  drawParticles(t) {
    this.ctx.save();
    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = t.accent;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = p.radius * 2;
      this.ctx.shadowColor = t.accent;
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawTopBar(t) {
    this.ctx.save();

    // Top Header Banner
    const barHeight = 100;
    this.ctx.fillStyle = 'rgba(7, 11, 20, 0.85)';
    this.ctx.fillRect(0, 0, this.width, barHeight);

    // Subtle accent bottom line
    this.ctx.fillStyle = t.accent;
    this.ctx.fillRect(0, barHeight - 3, this.width, 3);

    // Live Badge (Left)
    this.ctx.fillStyle = '#ef4444';
    this.roundRect(40, 30, 110, 40, 20);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('● LIVE', 95, 57);

    // Main Title & Subtitle (Center Left)
    this.ctx.textAlign = 'left';
    this.ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = t.textMain;
    if (this.enableGlow) {
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = t.accentGlow;
    }
    this.ctx.fillText(this.title, 180, 52);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = t.textSub;
    this.ctx.fillText(this.subtitle, 185, 80);

    // Live Clocks (Right)
    if (this.clockFormat !== 'none') {
      this.drawClock(t);
    }

    this.ctx.restore();
  }

  drawClock(t) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');

    // Local time string
    const localHours = pad(now.getHours());
    const localMins = pad(now.getMinutes());
    const localSecs = pad(now.getSeconds());
    const localStr = `${localHours}:${localMins}:${localSecs} LOCAL`;

    // UTC string
    const utcHours = pad(now.getUTCHours());
    const utcMins = pad(now.getUTCMinutes());
    const utcSecs = pad(now.getUTCSeconds());
    const utcStr = `${utcHours}:${utcMins}:${utcSecs} UTC`;

    this.ctx.textAlign = 'right';
    this.ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    this.ctx.fillStyle = t.accent;

    if (this.clockFormat === 'both') {
      this.ctx.fillText(localStr, this.width - 40, 50);
      this.ctx.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace';
      this.ctx.fillStyle = t.textSub;
      this.ctx.fillText(utcStr, this.width - 40, 78);
    } else if (this.clockFormat === 'local') {
      this.ctx.fillText(localStr, this.width - 40, 62);
    } else if (this.clockFormat === 'utc') {
      this.ctx.fillText(utcStr, this.width - 40, 62);
    }
  }

  drawCentralCard(t) {
    this.ctx.save();

    const cardW = 1200;
    const cardH = 580;
    const cardX = (this.width - cardW) / 2;
    const cardY = 220;

    // Glassmorphic backing card
    this.ctx.fillStyle = t.cardBg;
    this.roundRect(cardX, cardY, cardW, cardH, 24);
    this.ctx.fill();

    // Card border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 2;
    this.roundRect(cardX, cardY, cardW, cardH, 24);
    this.ctx.stroke();

    // Subtle Top Accent Strip inside card
    this.ctx.fillStyle = t.accent;
    this.roundRect(cardX, cardY, cardW, 6, [24, 24, 0, 0]);
    this.ctx.fill();

    // Card Header
    this.ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = t.accent;
    this.ctx.textAlign = 'left';
    this.ctx.fillText('📌 LIVE ANNOUNCEMENTS & INFORMATION', cardX + 50, cardY + 65);

    // Multi-line wrapped body text
    this.ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.textBaseline = 'top';

    const lines = this.notice.split('\n');
    let currentY = cardY + 115;
    const lineHeight = 46;
    const maxLines = 9;
    let lineCount = 0;

    lines.forEach(line => {
      if (lineCount < maxLines) {
        this.ctx.fillText(line, cardX + 50, currentY);
        currentY += lineHeight;
        lineCount++;
      }
    });

    this.ctx.restore();
  }

  drawScrollingTicker(t) {
    this.ctx.save();

    const tickerHeight = 70;
    const tickerY = this.height - tickerHeight;

    // Ticker background bar
    this.ctx.fillStyle = '#070b14';
    this.ctx.fillRect(0, tickerY, this.width, tickerHeight);

    // Accent top border
    this.ctx.fillStyle = t.tickerBorder;
    this.ctx.fillRect(0, tickerY, this.width, 3);

    // Left pinned badge: "NEWS FEED"
    const badgeW = 160;
    this.ctx.fillStyle = t.accent;
    this.ctx.fillRect(0, tickerY + 3, badgeW, tickerHeight - 3);

    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('LIVE WIRE', badgeW / 2, tickerY + tickerHeight / 2);

    // Scrolling text area with clip region
    this.ctx.beginPath();
    this.ctx.rect(badgeW, tickerY, this.width - badgeW, tickerHeight);
    this.ctx.clip();

    this.ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';

    const textWidth = this.ctx.measureText(this.tickerText).width;
    const gap = 120;
    const totalLoopWidth = textWidth + gap;

    // Move offset
    this.tickerOffset -= this.tickerSpeed;
    if (this.tickerOffset <= -totalLoopWidth) {
      this.tickerOffset = 0;
    }

    const startX = badgeW + 30 + this.tickerOffset;
    const centerY = tickerY + tickerHeight / 2 + 2;

    // Draw multiple repetitions for seamless continuous scrolling
    this.ctx.fillText(this.tickerText, startX, centerY);
    this.ctx.fillText(this.tickerText, startX + totalLoopWidth, centerY);
    this.ctx.fillText(this.tickerText, startX + totalLoopWidth * 2, centerY);

    this.ctx.restore();
  }

  // Rounded rectangle helper
  roundRect(x, y, w, h, radius) {
    if (typeof radius === 'number') {
      radius = [radius, radius, radius, radius];
    }
    const [tl, tr, br, bl] = radius;
    this.ctx.beginPath();
    this.ctx.moveTo(x + tl, y);
    this.ctx.lineTo(x + w - tr, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.ctx.lineTo(x + w, y + h - br);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.ctx.lineTo(x + bl, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.ctx.lineTo(x, y + tl);
    this.ctx.quadraticCurveTo(x, y, x + tl, y);
    this.ctx.closePath();
  }
}

window.CanvasRenderer = CanvasRenderer;
