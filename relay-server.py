"""
StreamCraft 24/7 — WebSocket to RTMP Relay (Python)

Bridges browser WebM MediaRecorder streams directly into YouTube Live RTMP.
Requirements: Python 3.8+ and FFmpeg.

Usage:
    pip install websockets
    python relay-server.py
"""

import asyncio
import json
import subprocess
import os

PORT = int(os.environ.get("PORT", 8080))

async def handler(websocket):
    print("Client connected from browser.")
    ffmpeg_process = None

    try:
        async for message in websocket:
            if isinstance(message, str) or (isinstance(message, bytes) and message.startswith(b'{')):
                try:
                    data = json.loads(message if isinstance(message, str) else message.decode('utf-8'))
                    if data.get('action') == 'start_rtmp' and 'rtmpUrl' in data:
                        rtmp_url = data['rtmpUrl']
                        print(f"Starting FFmpeg to RTMP target...")
                        ffmpeg_process = subprocess.Popen([
                            'ffmpeg',
                            '-i', '-',
                            '-c:v', 'copy',
                            '-c:a', 'aac',
                            '-b:a', '128k',
                            '-ar', '44100',
                            '-f', 'flv',
                            rtmp_url
                        ], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        continue
                    elif data.get('action') == 'stop_rtmp':
                        if ffmpeg_process:
                            ffmpeg_process.stdin.close()
                            ffmpeg_process.terminate()
                            ffmpeg_process = None
                        continue
                except json.JSONDecodeError:
                    pass

            if ffmpeg_process and ffmpeg_process.stdin and not ffmpeg_process.stdin.closed:
                try:
                    ffmpeg_process.stdin.write(message)
                    ffmpeg_process.stdin.flush()
                except (BrokenPipeError, OSError):
                    print("FFmpeg pipe closed.")
                    ffmpeg_process = None

    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        print("Client disconnected.")
        if ffmpeg_process:
            try:
                ffmpeg_process.stdin.close()
                ffmpeg_process.terminate()
            except Exception:
                pass

async def main():
    import websockets
    print(f"📡 StreamCraft Python WebSocket-to-RTMP Relay listening on ws://localhost:{PORT}")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
