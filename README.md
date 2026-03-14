# deepu-life 🏃📚🌱

> Deepu's personal life tracker — Running · Reading · Hydroponics

Live at: **https://deepuhub.github.io/deepu-life**

---

## What it tracks

| Tab | What you log |
|-----|-------------|
| 🏃 Run | Date, distance (miles), duration, notes → auto-calculates pace |
| 📚 Read | Title, author, category, status (reading / done / planned) |
| 🌱 Grow | Plant, start date, hydro system, status, notes → auto-counts days |

Data is stored in your **browser's localStorage** — it persists across visits on the same device.

---

## How to create this repo on GitHub

```bash
# 1. Go to github.com/new
#    Name: deepu-life
#    ✓ Public
#    ✓ Add README

# 2. Clone it locally
git clone https://github.com/deepuHub/deepu-life.git
cd deepu-life

# 3. Copy the files in
cp /path/to/downloads/index.html ./index.html
cp /path/to/downloads/_config.yml ./_config.yml

# 4. Push
git add .
git commit -m "Initial commit: deepu-life tracker"
git push origin main

# 5. Enable GitHub Pages
#    → Settings → Pages → Source: main branch → / (root)
#    Site will be live at: https://deepuhub.github.io/deepu-life
```

---

## Features

- ✅ Fully interactive — add & delete entries live
- ✅ Auto-calculates run pace (min/mile)
- ✅ Auto-counts hydro plant growth days
- ✅ Summary stats on hero and each tab
- ✅ Dark mode, distinctive Fraunces + Epilogue typography
- ✅ Google Analytics (UA-139981219-1) embedded
- ✅ Responsive — works on mobile
- ✅ Zero dependencies — no npm, no build step

---

## File structure

```
deepu-life/
├── index.html      ← entire app (HTML + CSS + JS, self-contained)
├── _config.yml     ← GitHub Pages config
└── README.md
```

---

Hosted with ❤ on GitHub Pages.
