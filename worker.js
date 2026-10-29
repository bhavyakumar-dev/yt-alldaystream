// ==========================================================================
// StreamCraft 24/7 Web Worker Ticker (Anti-Throttling Keepalive)
// ==========================================================================
// Browsers throttle background tabs' requestAnimationFrame & setInterval.
// This worker runs on a background thread to deliver steady 30 FPS clock ticks
// regardless of whether the browser tab is minimized or hidden.

let timerId = null;
let intervalMs = 1000 / 30; // 30 FPS by default (~33.33ms)

self.onmessage = function(e) {
  const data = e.data;
  if (!data) return;

  if (data.action === 'start') {
    if (data.fps) {
      intervalMs = 1000 / data.fps;
    }
    if (timerId !== null) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
    }, intervalMs);
    self.postMessage({ type: 'status', status: 'running', interval: intervalMs });
  } else if (data.action === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    self.postMessage({ type: 'status', status: 'stopped' });
  } else if (data.action === 'setFps') {
    if (data.fps) {
      intervalMs = 1000 / data.fps;
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = setInterval(() => {
          self.postMessage({ type: 'tick', timestamp: Date.now() });
        }, intervalMs);
      }
    }
  }
};
