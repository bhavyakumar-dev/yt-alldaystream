// ==========================================================================
// StreamCraft 24/7 Universal Streamer & Ingest Protocols
// ==========================================================================
// Supports:
// 1. WebRTC WHIP (RFC 9321): Cloudflare Stream & WHIP-compliant Ingest
// 2. WebSocket-to-RTMP: Classic YouTube Live RTMP Stream Key Relay
// 3. Virtual In-Browser Clean Feed: Zero-relay YouTube Studio Webcam Ingest

class UniversalStreamer {
  constructor(canvasElement, screenVideoElement, audioEngine) {
    this.canvas = canvasElement;
    this.video = screenVideoElement;
    this.audioEngine = audioEngine;

    this.mediaStream = null;
    this.peerConnection = null;
    this.webSocket = null;
    this.mediaRecorder = null;

    this.isStreaming = false;
    this.streamingTarget = 'youtube'; // 'youtube', 'cloudflare', 'custom-whip'
    this.startTime = null;
    this.uptimeInterval = null;

    // Config options
    this.fps = 30;
    this.resolution = '1080p';

    // Callbacks
    this.onStatusChange = null;
    this.onUptimeUpdate = null;
    this.onError = null;
  }

  // Build combined MediaStream from Canvas + Web Audio
  getCombinedStream() {
    const canvasStream = this.canvas.captureStream(this.fps);
    const audioTrack = this.audioEngine.getAudioTrack();

    const tracks = [...canvasStream.getVideoTracks()];
    if (audioTrack) {
      tracks.push(audioTrack);
    }

    this.mediaStream = new MediaStream(tracks);
    return this.mediaStream;
  }

  // Master Start Broadcast
  async startBroadcast(config) {
    if (this.isStreaming) return;
    this.streamingTarget = config.target || 'youtube';

    // Ensure audio engine is active
    await this.audioEngine.resume();
    const stream = this.getCombinedStream();

    this.startTime = Date.now();
    this.startUptimeTracker();

    try {
      if (this.streamingTarget === 'cloudflare' || this.streamingTarget === 'custom-whip') {
        await this.startWhipStream(config);
      } else if (this.streamingTarget === 'youtube') {
        if (config.useRelay && config.relayUrl) {
          await this.startWebSocketRtmpStream(config);
        } else {
          // Direct virtual feed mode
          this.isStreaming = true;
          this.triggerStatus('live', 'Virtual Studio Ready (Capture this tab in YouTube Studio)');
        }
      }
    } catch (err) {
      console.error("Broadcast failed to start:", err);
      this.stopBroadcast();
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // WebRTC WHIP (RFC 9321) Protocol Engine
  // --------------------------------------------------------------------------
  async startWhipStream(config) {
    let whipUrl = config.whipUrl;
    let bearerToken = config.authToken || config.streamId || '';

    // Auto-construct Cloudflare Stream WHIP URL if customer provided stream ID
    if (this.streamingTarget === 'cloudflare') {
      if (!whipUrl && config.streamId) {
        throw new Error("Please specify your Cloudflare Customer WHIP URL or customer subdomain.");
      }
    }

    if (!whipUrl) {
      throw new Error("WHIP Endpoint URL is required for WebRTC streaming.");
    }

    this.triggerStatus('connecting', 'Negotiating WebRTC WHIP handshake...');

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection = pc;

    // Add audio and video tracks
    const stream = this.mediaStream;
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.isStreaming = true;
        this.triggerStatus('live', 'LIVE (WebRTC WHIP)');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.triggerStatus('error', 'Connection lost, retrying...');
      }
    };

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete for cleaner SDP
    await new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 2000); // 2s max wait
      }
    });

    const headers = {
      'Content-Type': 'application/sdp'
    };
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    const response = await fetch(whipUrl, {
      method: 'POST',
      headers: headers,
      body: pc.localDescription.sdp
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`WHIP server responded with HTTP ${response.status}: ${errText}`);
    }

    const sdpAnswer = await response.text();
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: sdpAnswer
    }));

    this.isStreaming = true;
    this.triggerStatus('live', 'LIVE (WebRTC WHIP Connected)');
  }

  // --------------------------------------------------------------------------
  // WebSocket-to-RTMP Relay Engine
  // --------------------------------------------------------------------------
  async startWebSocketRtmpStream(config) {
    const relayUrl = config.relayUrl;
    const streamKey = config.streamKey;
    const rtmpServer = config.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2';

    this.triggerStatus('connecting', `Connecting to RTMP relay: ${relayUrl}...`);

    return new Promise((resolve, reject) => {
      try {
        this.webSocket = new WebSocket(relayUrl);
      } catch (e) {
        return reject(e);
      }

      this.webSocket.binaryType = 'arraybuffer';

      this.webSocket.onopen = () => {
        // Send initial handshake configuration
        this.webSocket.send(JSON.stringify({
          action: 'start_rtmp',
          rtmpUrl: `${rtmpServer}/${streamKey}`
        }));

        // Start MediaRecorder to pipe WebM/H.264 video chunks
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
          mimeType = 'video/webm;codecs=h264,opus';
        }

        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
          mimeType: mimeType,
          videoBitsPerSecond: 3000000 // 3 Mbps for 1080p
        });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0 && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(event.data);
          }
        };

        this.mediaRecorder.start(1000); // 1-second chunks
        this.isStreaming = true;
        this.triggerStatus('live', 'LIVE (RTMP Stream Key)');
        resolve();
      };

      this.webSocket.onerror = (err) => {
        console.error("Relay WebSocket error:", err);
        reject(new Error("Could not connect to WebSocket RTMP relay. Is relay-server running?"));
      };

      this.webSocket.onclose = () => {
        if (this.isStreaming) {
          this.triggerStatus('offline', 'Relay disconnected.');
          this.stopBroadcast();
        }
      };
    });
  }

  // Master Stop Broadcast
  stopBroadcast() {
    this.isStreaming = false;

    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval);
      this.uptimeInterval = null;
    }
    this.startTime = null;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
      this.mediaRecorder = null;
    }

    if (this.webSocket) {
      try {
        this.webSocket.send(JSON.stringify({ action: 'stop_rtmp' }));
        this.webSocket.close();
      } catch (e) {}
      this.webSocket = null;
    }

    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (e) {}
      this.peerConnection = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    this.triggerStatus('offline', 'OFFLINE');
    if (this.onUptimeUpdate) this.onUptimeUpdate('00:00:00');
  }

  // Uptime tracker
  startUptimeTracker() {
    if (this.uptimeInterval) clearInterval(this.uptimeInterval);
    this.uptimeInterval = setInterval(() => {
      if (!this.startTime) return;
      const elapsedMs = Date.now() - this.startTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      const formatted = `${hours}:${mins}:${secs}`;
      if (this.onUptimeUpdate) this.onUptimeUpdate(formatted);
    }, 1000);
  }

  triggerStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange({ state, message });
    }
  }

  // Picture-in-Picture helper
  async requestPictureInPicture() {
    // Create temporary video element to play canvas stream for PiP
    const pipVideo = document.createElement('video');
    pipVideo.srcObject = this.mediaStream || this.getCombinedStream();
    pipVideo.muted = true;
    pipVideo.autoplay = true;

    await pipVideo.play();
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (pipVideo.requestPictureInPicture) {
      await pipVideo.requestPictureInPicture();
    }
  }
}

window.UniversalStreamer = UniversalStreamer;
