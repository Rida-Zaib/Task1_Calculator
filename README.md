# 🧮 All-in-One Calculator

A single glass-panel calculator app with **7 switchable modes** — Standard, Scientific, BMI, Age, CGPA, Height, and Distance — built with plain HTML, CSS, and vanilla JavaScript. No frameworks, no build step, no dependencies beyond two Google Fonts.

**Live preview:** https://claude.ai/artifact/Xh6BE8wos5XaXhdkQ1BJaM

---

## ✨ Features

### 🧮 Standard
Basic arithmetic (`+ − × ÷`) with correct operator precedence and chaining (`5 + 3 × 2` → `11`), backspace, sign toggle, and a clear "Cannot divide by zero" error instead of crashing.

### 🔬 Scientific
Everything Standard has, plus `sin cos tan`, `ln log`, `√ x² 1/x n!`, `%`, `π e`, and a `^` power operator — with a DEG/RAD toggle for trig functions. Invalid input (e.g. `√(-4)`, `ln(0)`) shows "Invalid input" instead of `NaN`.

### ⚖️ BMI
Accepts weight in **kg or lb** and height in **cm or ft/in**, and returns the BMI value plus its category (Underweight / Normal / Overweight / Obese).

### 🎂 Age
Calculates exact age in years, months, and days between a date of birth and any target date (defaults to today), plus the total number of days.

### 🎓 CGPA
- A fully **editable grading scale** (add/remove grade letters and their point values), since every university grades differently. An optional reference image can be uploaded for your own eyes — a static page can't reliably *read* a photo of a table, so it's kept as a visual reference only, never used in the calculation.
- Add course rows (credit hours + grade) to get this semester's GPA.
- Enter a **previous CGPA + previous credit hours** to get the new **cumulative CGPA**, combining old and new coursework the same way universities do.

### 📏 Height
Live two-way conversion between centimeters and feet/inches — type in either field and the other updates instantly.

### 🌍 Distance
Converts between kilometers, meters, centimeters, miles, yards, and feet.

### 🎨 Design
- Glassmorphism card: layered translucent gradients, an animated light "sheen" sweep, and beveled highlight edges — built to look glassy even in renderers where `backdrop-filter` blur doesn't apply.
- Animated background gradient that slowly shifts color.
- **Each tab has its own color theme** (and its own set of gently floating doodle icons) that changes automatically when you switch modes:
  - Standard/Scientific — violet & pink, math symbols (`➕ ✖️ π ∑`)
  - BMI — teal & green, health icons (`⚖️ 🍎 💪`)
  - Age — amber & orange (`🎂 🎈 🎉`)
  - CGPA — indigo & gold (`🎓 📚 🏆`)
  - Height — sky blue (`📏 📐 🧍`)
  - Distance — cyan & blue (`🌍 ✈️ 🚗`)
- Full keyboard support on Standard/Scientific: digits, `+ − × ÷ ^`, `Enter`, `Backspace`, `Esc`.
- Respects `prefers-reduced-motion` (animations slow down rather than disappear).
- Fully responsive; no native scrollbar clutter (page still scrolls, the bar is just hidden).

---

## 🛠 Tech stack

Plain **HTML5**, **CSS3** (Grid + Flexbox, no framework), and **vanilla JavaScript** (no libraries, no `eval()`). Fonts loaded from Google Fonts (Space Grotesk, JetBrains Mono).

## 📁 File structure

```
task-1-calculator/
├── index.html   → markup for all 7 calculator panels
├── style.css    → glassmorphism styling, per-tab themes, animations
├── logic.js     → pure calculation functions (no DOM) — the "engine"
└── ui.js        → wires the DOM: tabs, buttons, forms, keyboard input
```

`logic.js` is kept DOM-free on purpose so its functions can be unit-tested directly in Node (see **Testing** below) without needing a browser.

## ▶️ How to run

No build step — just open `index.html` in any modern browser. That's it.

## 🧪 Testing

The core logic in `logic.js` was verified with **43 automated test cases** run in Node (arithmetic precedence, division-by-zero handling, trig/log/factorial edge cases, BMI categories, age date-borrow edge cases, custom-scale and cumulative CGPA math, and unit conversions) — all passing. The UI layer was checked with static consistency scripts confirming every `id` and `data-*` attribute referenced in `ui.js` actually exists in `index.html`.

## ♿ Accessibility

- Every button is a real `<button>` with `addEventListener` — no inline `onclick`.
- `aria-live` on the display so screen readers announce new results.
- Visible focus outlines on every interactive element.
- Reduced-motion users get slower animations instead of a jarring instant cutoff.

---

Built as part of the Web Development & Designing track — Level 2, Task 1 (Calculator), extended well beyond the base requirement with six additional calculator modes.
