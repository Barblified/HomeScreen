from pathlib import Path
import re

# Blood pressure: position only logged readings on the x-axis.
p = Path('assets/health-bp-chart.js')
text = p.read_text()
old = """    const startTime = history[0].timestamp;
    const endTime = history[history.length - 1].timestamp;
    const timeRange = Math.max(1, endTime - startTime);

    const xFor = timestamp => margin.left + ((timestamp - startTime) / timeRange) * plotWidth;
"""
new = """    const pointCount = history.length;
    const xForIndex = index => margin.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
"""
if old not in text:
    raise SystemExit('BP x-axis source block not found')
text = text.replace(old, new, 1)
pattern = re.compile(r"    const dayMs = 24 \* 60 \* 60 \* 1000;.*?\n    function drawSeries", re.S)
tick_block = """    const desiredTicks = compact ? 4 : 6;
    const tickStep = Math.max(1, Math.ceil((pointCount - 1) / Math.max(1, desiredTicks - 1)));
    const tickIndices = [];
    for (let index = 0; index < pointCount; index += tickStep) tickIndices.push(index);
    if (tickIndices[tickIndices.length - 1] !== pointCount - 1) tickIndices.push(pointCount - 1);

    tickIndices.forEach((historyIndex, tickIndex) => {
      const x = xForIndex(historyIndex);
      context.fillStyle = '#B6C9DB';
      context.textAlign = tickIndex === 0 ? 'left' : historyIndex === pointCount - 1 ? 'right' : 'center';
      context.fillText(formatDate(history[historyIndex].timestamp), x, cssHeight - 17);
    });

    function drawSeries"""
text, count = pattern.subn(tick_block, text, count=1)
if count != 1:
    raise SystemExit('BP tick block not found')
text = text.replace('const x = xFor(entry.timestamp);', 'const x = xForIndex(index);')
p.write_text(text)

# Waist: position only logged readings on the x-axis.
p = Path('assets/health-waist-chart.js')
text = p.read_text()
old = """    const startTime = series[0].timestamp;
    const endTime = series[series.length - 1].timestamp;
    const timeRange = Math.max(1, endTime - startTime);

    const xFor = timestamp => series.length === 1
      ? margin.left + plotWidth / 2
      : margin.left + ((timestamp - startTime) / timeRange) * plotWidth;
"""
new = """    const startTime = series[0].timestamp;
    const endTime = series[series.length - 1].timestamp;
    const pointCount = series.length;
    const xForIndex = index => pointCount === 1
      ? margin.left + plotWidth / 2
      : margin.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
"""
if old not in text:
    raise SystemExit('Waist x-axis source block not found')
text = text.replace(old, new, 1)
text = text.replace('xFor(series[0].timestamp)', 'xForIndex(0)')
text = text.replace('series.forEach(entry => {\n        const value = entry[key];', 'series.forEach((entry, index) => {\n        const value = entry[key];')
text = text.replace('const x = xFor(entry.timestamp);', 'const x = xForIndex(index);')
p.write_text(text)
