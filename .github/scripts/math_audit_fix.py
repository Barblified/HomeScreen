from pathlib import Path

health = Path("health/content.html")
s = health.read_text()

old_math = '''      const bmi = toNumber(metrics.currentBmi);
      const suppliedLost = toNumber(metrics.totalLostKg);
      const lost = suppliedLost !== null
        ? suppliedLost
        : start !== null && current !== null
          ? start - current
          : null;
      const suppliedProgress = toNumber(metrics.checkpointProgressPercent);
      const progress = suppliedProgress === null ? null : clamp(suppliedProgress, 0, 100);'''

new_math = '''      const height = toNumber(metrics.heightM);
      const suppliedBmi = toNumber(metrics.currentBmi);
      const bmi = current !== null && height !== null && height > 0
        ? current / (height ** 2)
        : suppliedBmi;
      const suppliedLost = toNumber(metrics.totalLostKg);
      const lost = start !== null && current !== null
        ? start - current
        : suppliedLost;
      const suppliedProgress = toNumber(metrics.checkpointProgressPercent);
      const calculatedProgress = start !== null && current !== null && checkpoint !== null && start !== checkpoint
        ? ((start - current) / (start - checkpoint)) * 100
        : null;
      const progressSource = calculatedProgress !== null ? calculatedProgress : suppliedProgress;
      const progress = progressSource === null ? null : clamp(progressSource, 0, 100);'''

if old_math not in s:
    raise SystemExit("health render maths block not found")
s = s.replace(old_math, new_math, 1)

old_conversion = '''    function formatStonePounds(valueKg) {
      const kilograms = toNumber(valueKg);
      if (kilograms === null) return "—";

      const totalOunces = Math.round(kilograms * 2.2046226218 * 16);
      const ouncesPerStone = 14 * 16;
      const stones = Math.floor(totalOunces / ouncesPerStone);
      const ouncesAfterStones = totalOunces - stones * ouncesPerStone;
      const pounds = Math.floor(ouncesAfterStones / 16);
      const ounces = ouncesAfterStones - pounds * 16;
      const poundLabel = pounds === 1 ? "lb" : "lbs";

      return `${stones} st ${pounds} ${poundLabel} ${ounces} oz`;
    }'''

new_conversion = '''    function formatStonePounds(valueKg) {
      const kilograms = toNumber(valueKg);
      if (kilograms === null) return "—";

      const sign = kilograms < 0 ? "−" : "";
      const totalOunces = Math.round(Math.abs(kilograms) * 2.2046226218 * 16);
      const ouncesPerStone = 14 * 16;
      const stones = Math.floor(totalOunces / ouncesPerStone);
      const ouncesAfterStones = totalOunces % ouncesPerStone;
      const pounds = Math.floor(ouncesAfterStones / 16);
      const ounces = ouncesAfterStones % 16;
      const poundLabel = pounds === 1 ? "lb" : "lbs";

      return `${sign}${stones} st ${pounds} ${poundLabel} ${ounces} oz`;
    }'''

if old_conversion not in s:
    raise SystemExit("stone conversion block not found")
s = s.replace(old_conversion, new_conversion, 1)
health.write_text(s)

chart = Path("assets/health-weight-chart.js")
c = chart.read_text()
c = c.replace("Thin grey line = overall linear trend.", "Sky-blue line = overall linear trend.", 1)
c = c.replace("drawSeries(linearTrendSeries, 'trendKg', '#C4D3E0', 2);", "drawSeries(linearTrendSeries, 'trendKg', '#7DB9E8', 2);", 1)
chart.write_text(c)
