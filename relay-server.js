/**
 * StreamCraft 24/7 — WebSocket to RTMP Relay (Node.js)
 * 
 * Bridges browser WebM MediaRecorder streams directly into YouTube Live RTMP.
 * Requirements: Node.js (v16+) and FFmpeg installed on system.
 * 
 * Usage:
 *   npm install ws
 *   node relay-server.js
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`📡 StreamCraft WebSocket-to-RTMP Relay listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected from browser.');
  let ffmpeg = null;

  ws.on('message', (message) => {
    // Check if message is a JSON command
    if (typeof message === 'string' || (message instanceof Buffer && message[0] === 123 /* '{' */)) {
      try {
        const data = JSON.parse(message.toString());
        if (data.action === 'start_rtmp' && data.rtmpUrl) {
          console.log(`Starting FFmpeg transcode to: ${data.rtmpUrl.replace(/(live2\/).+/, '$1****')}`);

          ffmpeg = spawn('ffmpeg', [
            '-i', '-', // Read from stdin
            '-c:v', 'copy', // Copy video or transcode if needed
            '-c:a', 'aac',
            '-b:a', '128k',
            '-ar', '44100',
            '-f', 'flv',
            data.rtmpUrl
          ]);

          ffmpeg.stderr.on('data', (d) => {
            // Uncomment for verbose FFmpeg debugging:
            // process.stderr.write(d.toString());
          });

          ffmpeg.on('close', (code) => {
            console.log(`FFmpeg process exited with code ${code}`);
            ffmpeg = null;
          });

          return;
        } else if (data.action === 'stop_rtmp') {
          if (ffmpeg) {
            console.log('Stopping FFmpeg process...');
            ffmpeg.stdin.end();
            ffmpeg.kill('SIGINT');
            ffmpeg = null;
          }
          return;
        }
      } catch (e) {
        // Not a JSON command, treat as binary video/audio chunk
      }
    }

    // Binary video chunk from MediaRecorder
    if (ffmpeg && ffmpeg.stdin && ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(message);
    }
  });

  ws.on('close', () => {
    console.log('Browser client disconnected.');
    if (ffmpeg) {
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGINT');
      ffmpeg = null;
    }
  });
});
