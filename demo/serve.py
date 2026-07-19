#!/usr/bin/env python3
"""Start the Music Diary demo server."""
import http.server
import os
import socket
import sys
import webbrowser
from functools import partial

PORT = 3456
DEMO_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DEMO_DIR, **kwargs)

    def log_message(self, fmt, *args):
        sys.stdout.write(f"  {fmt % args}\n")


def main():
    os.chdir(DEMO_DIR)
    handler = partial(Handler)
    try:
        with http.server.HTTPServer(("", PORT), handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("🎵 音乐日记 Demo")
            print(f"   地址: {url}")
            print("   按 Ctrl+C 停止")
            print()
            try:
                webbrowser.open(url)
            except Exception:
                pass
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    except OSError as e:
        if e.errno == 48:
            print(f"端口 {PORT} 已被占用，尝试 {PORT + 1}...")
            globals()["PORT"] = PORT + 1
            main()
        else:
            raise


if __name__ == "__main__":
    main()
