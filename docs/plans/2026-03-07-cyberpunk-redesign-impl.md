# Cyberpunk Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the personal site with a dark cyberpunk / pro dashboard aesthetic, shift to a split sidebar + main content layout, and add a Tools section with glassmorphism cards.

**Architecture:** Pure static HTML/CSS/JS — no build tools, no framework. All changes are in-place edits to the three existing source files. The sidebar is fixed-position, the main area scrolls. Active nav state is managed by a scroll listener in JS.

**Tech Stack:** HTML5, CSS3 (custom properties, backdrop-filter, animations), vanilla JS, Google Fonts (Inter + JetBrains Mono), served via python3 http.server on port 3000.

---

### Task 1: Update font imports

**Files:**
- Modify: `src/index.html` (line 7-9)

**Step 1: Replace Google Fonts link**

In `src/index.html`, replace the existing `<link>` for fonts with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
```

**Step 2: Verify in browser**

Open http://localhost:3000 and open DevTools → Network → filter "fonts.googleapis". Confirm `JetBrains+Mono` appears in requests.

**Step 3: Commit**

```bash
git add src/index.html
git commit -m "style: swap Space Mono for JetBrains Mono"
```

---

### Task 2: Restructure HTML for sidebar layout

**Files:**
- Modify: `src/index.html`

**Step 1: Replace body content with sidebar + main structure**

Replace everything inside `<body>` with:

```html
<div class="grid-overlay"></div>

<div class="app-layout">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-top">
      <div class="sidebar-name">Andrae Williams</div>
      <div class="badge">// online</div>
    </div>

    <nav class="sidebar-nav">
      <a href="#home" class="nav-link active" data-section="home">
        <span class="nav-dot"></span>
        Home
      </a>
      <a href="#tools" class="nav-link" data-section="tools">
        <span class="nav-dot"></span>
        Tools
      </a>
    </nav>

    <div class="sidebar-bottom">
      <a href="https://github.com/MistaJoka" target="_blank" rel="noopener" class="sidebar-link">
        GitHub →
      </a>
    </div>
  </aside>

  <!-- Main content -->
  <main class="main-content">
    <!-- Home section -->
    <section id="home" class="section">
      <h1>Andrae Williams</h1>
      <p class="tagline">Building an arsenal of skills.</p>
      <p class="sub">Like Iron Man, Batman, and Superman — but the lab.</p>
    </section>

    <!-- Tools section -->
    <section id="tools" class="section">
      <div class="section-header">
        <h2>Tools</h2>
        <span class="section-count">// 4 items</span>
      </div>
      <div class="tools-grid">
        <div class="tool-card">
          <div class="tool-card-header">
            <span class="tool-name">Tool One</span>
            <span class="status-badge active">// active</span>
          </div>
          <p class="tool-desc">Short description of what this tool does and why it matters.</p>
        </div>
        <div class="tool-card">
          <div class="tool-card-header">
            <span class="tool-name">Tool Two</span>
            <span class="status-badge active">// active</span>
          </div>
          <p class="tool-desc">Short description of what this tool does and why it matters.</p>
        </div>
        <div class="tool-card">
          <div class="tool-card-header">
            <span class="tool-name">Tool Three</span>
            <span class="status-badge wip">// wip</span>
          </div>
          <p class="tool-desc">Short description of what this tool does and why it matters.</p>
        </div>
        <div class="tool-card">
          <div class="tool-card-header">
            <span class="tool-name">Tool Four</span>
            <span class="status-badge wip">// wip</span>
          </div>
          <p class="tool-desc">Short description of what this tool does and why it matters.</p>
        </div>
      </div>
    </section>
  </main>
</div>

<footer class="site-footer">
  <span>andraewilliams.com</span>
</footer>

<script src="js/main.js"></script>
```

**Step 2: Preview — should look broken (unstyled)**

Screenshot at http://localhost:3000 — expect raw unstyled HTML. This is correct.

**Step 3: Commit**

```bash
git add src/index.html
git commit -m "feat: restructure HTML for sidebar + tools layout"
```

---

### Task 3: Replace CSS — variables and base reset

**Files:**
- Modify: `src/css/style.css` (full rewrite)

**Step 1: Replace entire file with new base**

```css
/* =====================
   RESET
   ===================== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* =====================
   VARIABLES
   ===================== */
:root {
  --bg:           #0a0a0f;
  --sidebar-bg:   #080810;
  --surface:      #111118;
  --surface-glass: rgba(17, 17, 24, 0.6);
  --accent:       #00f0ff;
  --accent-dim:   rgba(0, 240, 255, 0.08);
  --accent-glow:  rgba(0, 240, 255, 0.15);
  --violet:       #9b5dff;
  --magenta:      #ff2d78;
  --text:         #e8e8f0;
  --muted:        #5a5a7a;
  --border:       rgba(255, 255, 255, 0.06);
  --font-mono:    'JetBrains Mono', monospace;
  --font-sans:    'Inter', sans-serif;
  --sidebar-w:    220px;
  --radius-card:  14px;
  --radius-btn:   8px;
}

/* =====================
   BASE
   ===================== */
html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  min-height: 100vh;
}

/* =====================
   GRID OVERLAY
   ===================== */
.grid-overlay {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 240, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 240, 255, 0.025) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}
```

**Step 2: Screenshot — should see grid on dark bg, still unstyled content**

**Step 3: Commit**

```bash
git add src/css/style.css
git commit -m "style: add css reset and design system variables"
```

---

### Task 4: CSS — app layout and sidebar

**Files:**
- Modify: `src/css/style.css` (append)

**Step 1: Append sidebar and layout styles**

```css
/* =====================
   APP LAYOUT
   ===================== */
.app-layout {
  display: flex;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

/* =====================
   SIDEBAR
   ===================== */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 2rem 1.5rem;
  z-index: 100;
}

.sidebar-top {
  margin-bottom: 2.5rem;
}

.sidebar-name {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 0.75rem;
}

/* Status badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid rgba(0, 240, 255, 0.15);
  border-radius: 4px;
  padding: 0.2rem 0.6rem;
  letter-spacing: 0.08em;
}

.badge::before {
  content: '';
  width: 5px;
  height: 5px;
  background: var(--accent);
  border-radius: 50%;
  animation: pulse 2s ease infinite;
}

/* Nav */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--muted);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-btn);
  border-left: 2px solid transparent;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
  position: relative;
}

.nav-link:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.03);
}

.nav-link.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-dim);
  text-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
}

.nav-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.5;
  flex-shrink: 0;
}

.nav-link.active .nav-dot {
  opacity: 1;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

/* Sidebar bottom */
.sidebar-bottom {
  border-top: 1px solid var(--border);
  padding-top: 1.25rem;
}

.sidebar-link {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s;
}

.sidebar-link:hover {
  color: var(--accent);
}
```

**Step 2: Screenshot — sidebar should be visible, dark, on the left**

**Step 3: Commit**

```bash
git add src/css/style.css
git commit -m "style: sidebar layout and nav styles"
```

---

### Task 5: CSS — main content and home section

**Files:**
- Modify: `src/css/style.css` (append)

**Step 1: Append main content and home section styles**

```css
/* =====================
   MAIN CONTENT
   ===================== */
.main-content {
  margin-left: var(--sidebar-w);
  flex: 1;
  min-height: 100vh;
}

/* =====================
   SECTIONS
   ===================== */
.section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 4rem 4rem;
  animation: fadeUp 0.5s ease both;
}

/* =====================
   HOME SECTION
   ===================== */
#home h1 {
  font-family: var(--font-mono);
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  text-shadow: 0 0 60px rgba(0, 240, 255, 0.15);
  margin-bottom: 1rem;
  line-height: 1.1;
}

.tagline {
  font-size: clamp(1rem, 2vw, 1.2rem);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.sub {
  font-size: 0.95rem;
  color: var(--muted);
  font-style: italic;
}

/* =====================
   FOOTER
   ===================== */
.site-footer {
  position: fixed;
  bottom: 1.5rem;
  left: calc(var(--sidebar-w) + 2rem);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--muted);
  letter-spacing: 0.05em;
  z-index: 1;
}
```

**Step 2: Screenshot — home section should look styled, name large, content centered vertically**

**Step 3: Commit**

```bash
git add src/css/style.css
git commit -m "style: main content and home section"
```

---

### Task 6: CSS — tools section and glassmorphism cards

**Files:**
- Modify: `src/css/style.css` (append)

**Step 1: Append tools section styles**

```css
/* =====================
   TOOLS SECTION
   ===================== */
#tools {
  justify-content: flex-start;
  padding-top: 5rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.section-header h2 {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.section-count {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--muted);
}

/* =====================
   TOOLS GRID
   ===================== */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  max-width: 800px;
}

/* =====================
   TOOL CARD
   ===================== */
.tool-card {
  background: var(--surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 1.75rem;
  box-shadow: 0 0 20px rgba(0, 240, 255, 0.03);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: default;
}

.tool-card:hover {
  transform: scale(1.02);
  border-color: rgba(0, 240, 255, 0.15);
  box-shadow: 0 0 30px rgba(0, 240, 255, 0.08), inset 0 0 20px rgba(0, 240, 255, 0.03);
}

.tool-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.tool-name {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
}

.tool-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.6;
}

/* =====================
   STATUS BADGES
   ===================== */
.status-badge {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  letter-spacing: 0.06em;
  font-weight: 400;
}

.status-badge.active {
  color: var(--accent);
  background: rgba(0, 240, 255, 0.08);
  border: 1px solid rgba(0, 240, 255, 0.2);
}

.status-badge.wip {
  color: var(--violet);
  background: rgba(155, 93, 255, 0.08);
  border: 1px solid rgba(155, 93, 255, 0.2);
}
```

**Step 2: Screenshot — tools grid with glassmorphism cards should be visible**

**Step 3: Commit**

```bash
git add src/css/style.css
git commit -m "style: tools section and glassmorphism cards"
```

---

### Task 7: CSS — animations and mobile responsive

**Files:**
- Modify: `src/css/style.css` (append)

**Step 1: Append animations and responsive styles**

```css
/* =====================
   ANIMATIONS
   ===================== */
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* =====================
   MOBILE (< 768px)
   ===================== */
@media (max-width: 768px) {
  :root {
    --sidebar-w: 0px;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: auto;
    flex-direction: row;
    align-items: center;
    padding: 0.75rem 1.25rem;
    border-right: none;
    border-bottom: 1px solid var(--border);
    z-index: 200;
  }

  .sidebar-top {
    margin-bottom: 0;
    margin-right: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .sidebar-nav {
    flex-direction: row;
    gap: 0.25rem;
    flex: unset;
  }

  .nav-link {
    border-left: none;
    border-bottom: 2px solid transparent;
    padding: 0.35rem 0.6rem;
  }

  .nav-link.active {
    border-left-color: transparent;
    border-bottom-color: var(--accent);
  }

  .sidebar-bottom {
    border-top: none;
    padding-top: 0;
    margin-left: 0.5rem;
  }

  .main-content {
    margin-left: 0;
    padding-top: 56px;
  }

  .section {
    padding: 2.5rem 1.5rem;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .site-footer {
    left: 1.25rem;
  }
}
```

**Step 2: Resize browser to mobile width and screenshot — sidebar should be a top bar**

**Step 3: Commit**

```bash
git add src/css/style.css
git commit -m "style: animations and mobile responsive layout"
```

---

### Task 8: JS — active nav state on scroll

**Files:**
- Modify: `src/js/main.js` (full rewrite)

**Step 1: Replace main.js with scroll-based nav tracking**

```js
// Active nav link tracking based on scroll position
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');

function setActiveNav(sectionId) {
  navLinks.forEach(link => {
    const isActive = link.dataset.section === sectionId;
    link.classList.toggle('active', isActive);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActiveNav(entry.target.id);
      }
    });
  },
  { threshold: 0.5 }
);

sections.forEach(section => observer.observe(section));
```

**Step 2: Verify in browser**

Scroll from Home to Tools — the active nav link in the sidebar should switch from `Home` to `Tools` as you scroll.

**Step 3: Commit**

```bash
git add src/js/main.js
git commit -m "feat: active nav state tracking on scroll"
```

---

### Task 9: Final visual review

**Step 1: Screenshot desktop**

Take a screenshot at full desktop width. Verify:
- [ ] Sidebar visible on left, dark background, ghost right border
- [ ] `// online` pulsing badge in sidebar
- [ ] Home section: large mono name, tagline, sub-line
- [ ] Tools section: 2-col card grid with glassmorphism cards
- [ ] Status badges colored correctly (cyan = active, violet = wip)
- [ ] Grid overlay visible on background

**Step 2: Screenshot mobile**

Resize to 375px wide. Verify:
- [ ] Sidebar is a top bar
- [ ] Nav links horizontal
- [ ] Tools grid single column

**Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "style: final polish and cleanup"
```
