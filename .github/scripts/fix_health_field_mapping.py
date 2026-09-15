from pathlib import Path

content_path = Path('health/content.html')
text = content_path.read_text()

replacements = [
    ('<section class="grid" aria-label="Weekly discipline">', '<section class="grid" aria-label="Health habits">'),
    ('<span>Logged</span>', '<span>Nutrition Days Logged</span>'),
    ('<span>Protein Days Hit</span>', '<span>Protein Target Days</span>'),
    ('<span>Sleep</span>', '<span id="sleep-label">Sleep Today</span>'),
    ('      sleepTargetDaysThisWeek: null,\n', '      sleepHoursToday: null,\n      sleepTargetDaysThisWeek: null,\n'),
    ('      const sleepDays = toNumber(metrics.sleepTargetDaysThisWeek);\n', '      const sleepHours = toNumber(metrics.sleepHoursToday);\n      const sleepDays = toNumber(metrics.sleepTargetDaysThisWeek);\n'),
    ('      setText("sleep", sleepDays === null ? "—" : `${sleepDays}/7`);\n', '''      if (sleepHours === null) {
        setText("sleep", sleepDays === null ? "—" : `${sleepDays}/7`);
        setText("sleep-label", "Sleep Target Days");
      } else {
        const sleepHoursText = Number.isInteger(sleepHours) ? sleepHours.toFixed(0) : sleepHours.toFixed(1);
        setText("sleep", `${sleepHoursText} h`);
        setText("sleep-label", `Today · ${sleepDays === null ? "—" : `${sleepDays}/7`} target days`);
      }
''')
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Expected health/content.html block not found: {old[:80]}')
    text = text.replace(old, new, 1)

content_path.write_text(text)

index_path = Path('health/index.html')
index = index_path.read_text()
if '20260915-0905' not in index:
    raise SystemExit('Expected cache version not found')
index = index.replace('20260915-0905', '20260915-0920')
index_path.write_text(index)
