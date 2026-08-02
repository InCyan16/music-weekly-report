#!/usr/bin/env python3
"""Start the Music Diary demo server."""
import http.server
import os
import sys
import threading
import webbrowser
from functools import partial

PORT = 3456
DEMO_DIR = os.path.dirname(os.path.abspath(__file__))
# 10048 = Windows WSAEADDRINUSE, 48 = macOS/BSD EADDRINUSE
ADDR_IN_USE = {48, 10048}


class Handler(http.server.SimpleHTTPRequestHandler):
    # Avoid hung keep-alive connections blocking later requests.
    protocol_version = "HTTP/1.1"
    timeout = 5

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DEMO_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Connection", "close")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stdout.write(f"  {fmt % args}\n")
        sys.stdout.flush()


def main(port: int = PORT):
    os.chdir(DEMO_DIR)
    handler = partial(Handler)
    try:
        # Threading so one slow/hung client cannot freeze the whole demo.
        httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
        httpd.daemon_threads = True
        url = f"http://127.0.0.1:{port}"
        print("🎵 音乐日记 Demo")
        print(f"   地址: {url}")
        print("   按 Ctrl+C 停止")
        print()
        sys.stdout.flush()
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
        with httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    except OSError as e:
        if e.errno in ADDR_IN_USE or getattr(e, "winerror", None) == 10048:
            print(f"端口 {port} 已被占用，尝试 {port + 1}...")
            main(port + 1)
        else:
            raise


if __name__ == "__main__":
    main()
