"""
Meeting AI Visualizer - Python server (zero dependencies, uses only stdlib)
Run with: python server.py
"""
import http.server
import json
import os
import urllib.request
import urllib.error
from pathlib import Path

# ── Load .env ──────────────────────────────────────────────────────────────────
def load_env():
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            val = val.strip().strip('"').strip("'")
            if key.strip() not in os.environ:
                os.environ[key.strip()] = val

load_env()

PORT             = int(os.environ.get("PORT", 3000))
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
PUBLIC_DIR       = Path(__file__).parent / "public"

SYSTEM_PROMPT = """Du er en ekspert i at analysere mødetransskriptioner og generere smukke HTML-visualiseringer.

Analyser transskriptionen og returnér KUN valid HTML med inline CSS — ingen markdown, ingen forklaringer, ingen kodeblokke.

Brug følgende regler for at vælge visualiseringstype:
- Produktudvikling / features → wireframe eller komponent-diagram
- Opgaver / to-do lister → kanban-board med tre kolonner: Backlog, In Progress, Done
- Tidslinje / deadlines / datoer → visuel horisontal tidslinje
- Brainstorm / idéer / kreativ diskussion → mindmap eller cluster-diagram
- Beslutninger / aftaler / konklusion → opsummeringstabell med to kolonner: "Beslutning" og "Ansvarlig"
- Hvis indholdet er blandet eller uklart → brug den mest relevante type

Krav til output:
- Professionelt, farverigt og let at læse
- Responsive layout der passer i en 60vw bred container
- Brug flotte farver, ikoner (unicode/emoji er OK), skygger og afrundede hjørner
- Alle tekster på dansk
- Start direkte med <div ... og slut med </div> — ingen andre tags udenfor"""

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript",
    ".css":  "text/css",
    ".png":  "image/png",
    ".ico":  "image/x-icon",
    ".svg":  "image/svg+xml",
}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} - {fmt % args}")

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/visualize":
            self.send_json(404, {"error": "Not found"})
            return

        length  = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        transcript = payload.get("transcript", "").strip()

        if not transcript:
            self.send_json(400, {"error": "Ingen transskription modtaget."})
            return

        if not ANTHROPIC_API_KEY:
            self.send_json(500, {"error": "ANTHROPIC_API_KEY mangler i .env filen."})
            return

        body = json.dumps({
            "model":      "claude-sonnet-4-6",
            "max_tokens": 4096,
            "system":     SYSTEM_PROMPT,
            "messages":   [{"role": "user", "content":
                f"Her er mødetransskriptionen:\n\n{transcript}\n\nGenerer en passende HTML-visualisering."}],
        }, ensure_ascii=False).encode("utf-8")

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "Content-Type":      "application/json",
                "x-api-key":         ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                html = data["content"][0]["text"].strip()
                self.send_json(200, {"html": html})
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8")
            print("  Claude API fejl:", err)
            self.send_json(500, {"error": f"Claude API fejl {e.code}: Tjek din API-nøgle."})
        except Exception as e:
            print("  Serverfejl:", e)
            self.send_json(500, {"error": str(e)})

    def do_GET(self):
        url_path = self.path.split("?")[0]
        if url_path == "/":
            url_path = "/index.html"

        file_path = PUBLIC_DIR / url_path.lstrip("/")

        if not file_path.exists() or not file_path.is_file():
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        ext  = file_path.suffix.lower()
        mime = MIME_TYPES.get(ext, "application/octet-stream")
        data = file_path.read_bytes()

        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    import webbrowser, threading, time

    server = http.server.HTTPServer(("localhost", PORT), Handler)
    print(f"\n🎙️  Meeting AI Visualizer kører på http://localhost:{PORT}")
    print("   Luk dette vindue for at stoppe serveren.\n")

    def open_browser():
        time.sleep(1.2)
        webbrowser.open(f"http://localhost:{PORT}")

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stoppet.")
