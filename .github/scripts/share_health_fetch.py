from pathlib import Path
import re

INDEX = Path('health/index.html')
CONTENT = Path('health/content.html')
CHARTS = [
    Path('assets/health-weight-chart.js'),
    Path('assets/health-bp-chart.js'),
    Path('assets/health-waist-chart.js'),
]

index = INDEX.read_text()
anchor = '  <link rel="stylesheet" href="../assets/type-system.css?v=20260915-0920">\n'
if anchor not in index:
    raise SystemExit('Health index cache-version anchor not found')

shared_loader = r'''  <script>
    (() => {
      const HEALTH_DATA_URL = "https://script.google.com/macros/s/AKfycbwihWQw8Frs1acA1Y-CELBw0NmX4O5KFzcqU3f8TbFpSegleKyPM64TkqTyoNyAWhLP/exec";
      const CACHE_MS = 30000;
      const TIMEOUT_MS = 12000;
      let cachedPayload = null;
      let cachedAt = 0;
      let inFlight = null;

      async function requestPayload() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, {
            cache: "no-store",
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } finally {
          clearTimeout(timer);
        }
      }

      window.getHealthData = async ({ force = false } = {}) => {
        const now = Date.now();
        if (!force && cachedPayload && now - cachedAt < CACHE_MS) return cachedPayload;
        if (inFlight) return inFlight;

        inFlight = (async () => {
          let lastError;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const payload = await requestPayload();
              cachedPayload = payload;
              cachedAt = Date.now();
              return payload;
            } catch (error) {
              lastError = error;
              if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 750));
            }
          }
          throw lastError;
        })();

        try {
          return await inFlight;
        } finally {
          inFlight = null;
        }
      };
    })();
  </script>
'''

index = index.replace(anchor, anchor + shared_loader, 1)
index = index.replace('20260915-0920', '20260915-0930')
INDEX.write_text(index)

content = CONTENT.read_text()
old_content_fetch = '''        const response = await fetch(`${REMOTE_METRICS_URL}?t=${Date.now()}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
'''
new_content_fetch = '''        let payload;
        let sharedLoader = null;
        try {
          if (window.parent !== window && typeof window.parent.getHealthData === "function") {
            sharedLoader = window.parent.getHealthData;
          }
        } catch (error) {
          sharedLoader = null;
        }

        if (sharedLoader) {
          payload = await sharedLoader();
        } else {
          const response = await fetch(`${REMOTE_METRICS_URL}?t=${Date.now()}`, {
            cache: "no-store"
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          payload = await response.json();
        }
'''
if old_content_fetch not in content:
    raise SystemExit('Health content fetch block not found')
content = content.replace(old_content_fetch, new_content_fetch, 1)
CONTENT.write_text(content)

pattern = re.compile(
    r"      const response = await fetch\(`\$\{HEALTH_DATA_URL\}\?t=\$\{Date\.now\(\)\}`, \{ cache: 'no-store' \}\);\n"
    r"      if \(!response\.ok\) throw new Error\(`HTTP \$\{response\.status\}`\);\n"
    r"(?:\n)?      const payload = await response\.json\(\);"
)
replacement = '''      let payload;
      if (typeof window.getHealthData === 'function') {
        payload = await window.getHealthData();
      } else {
        const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
      }'''

for path in CHARTS:
    text = path.read_text()
    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit(f'Fetch block not found in {path}')
    path.write_text(text)
