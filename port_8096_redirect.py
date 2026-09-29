# -*- coding: utf-8 -*-
"""
Redirects legacy Karigar Gate Pass requests from port 8096 to unified portal port 8080/gatepass/
"""
from http.server import HTTPServer, BaseHTTPRequestHandler

class RedirectHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302)
        target = f"http://{self.headers.get('Host', 'localhost').split(':')[0]}:8080/gatepass{self.path if self.path != '/' else '/'}"
        self.send_header("Location", target)
        self.end_headers()
        self.wfile.write(b"Redirecting to OSLC Cloud Master Portal...")

    def do_POST(self):
        self.do_GET()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    try:
        server = HTTPServer(("0.0.0.0", 8096), RedirectHandler)
        print("Port 8096 Redirector Active -> Forwarding to :8080/gatepass/")
        server.serve_forever()
    except Exception as e:
        print("Port 8096 redirector skipped:", e)
