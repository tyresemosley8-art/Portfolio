# CLAUDE.md — Tyrese Mosley Portfolio

## Project
Personal portfolio website for Tyrese Mosley — Information Science student and tech builder.

**Live:** https://portfolio-three-rho-3nl9fsv0zh.vercel.app  
**GitHub:** https://github.com/tyresemosley8-art/Portfolio (public repo)  
**Local:** `C:\Users\TyreseMosely\desktop\portfolio`

## Commands
```bash
npm run dev      # local dev server at localhost:5173
npm run build    # production build
```

**Push to deploy:**
```powershell
cd C:\Users\TyreseMosely\desktop\portfolio
git add -A
git commit -m "message"
git push https://TOKEN@github.com/tyresemosley8-art/Portfolio.git master
```
Vercel auto-deploys on every push to master.

## Stack
- Vite + React 18 (no UI libraries — plain CSS only)
- No TypeScript — plain JSX
- No Tailwind — all styles in `src/index.css`
- GitHub API for content management (commits `content.json` to repo)

## Architecture

### File structure
```
src/
  App.jsx                  # Root — loads content, keyboard shortcut, scroll reveal
  index.css                # All styles (single file)
  main.jsx
  components/
    Nav.jsx                # Fixed nav + hamburger + slide panel
    Hero.jsx               # Hero section
    About.jsx              # About section
    Projects.jsx           # Projects grid
    Resume.jsx             # Resume embed + download
    Admin.jsx              # Full admin modal (PIN + GitHub setup + content editing)
    Toast.jsx              # Toast notification
  lib/
    github.js              # GitHub API: fetch/save content.json
    defaultContent.js      # Placeholder content shown before GitHub loads
```

### Content system
All site content lives in `content.json` in the GitHub repo root. On load, `App.jsx` fetches it from GitHub API, falls back to `localStorage`, then falls back to `defaultContent.js`.

Admin panel saves by committing `content.json` back to GitHub → triggers Vercel redeploy.

**content.json shape:**
```json
{
  "hero": { "name": "Tyrese Mosley", "subtitle": "..." },
  "about": { "heading": "Who I am", "bio": "...", "journey": "..." },
  "projects": [{ "id", "title", "description", "stack": [], "image": null, "link": null }],
  "projectsHeading": "Things I've built",
  "resumeHeading": "Download my resume",
  "profilePhoto": null,
  "resume": null
}
```

### Admin panel
- **Shortcut:** Press **Shift+T**, then **Shift+M** (within 2 seconds)
- **Default PIN:** `1234` (stored in localStorage as `portfolio_admin_pin`)
- First login prompts GitHub setup: token + `tyresemosley8-art` + `Portfolio`
- Tabs: Hero, About, Projects, Resume — every text field is editable
- "Save & Deploy" commits content.json to GitHub → auto-redeploys

### Navigation
Hamburger (3 lines → X animation) opens a navy slide panel from the right with links to About, Projects, Resume sections.

### Animations
- Hero name: CSS keyframe (scale 1.05 → 1 + fade on load)
- All other sections: `.reveal` class + IntersectionObserver adds `.visible` (fade-up translateY 28px → 0)
- Stagger classes: `.reveal-d1` through `.reveal-d4` (0.1s–0.4s delays)

## Design tokens
```css
--bg:         #FFFFFF
--navy:       #0A1628
--slate:      #4A5568
--light-gray: #F7F8FA
--text:       #1A202C
--ease:       cubic-bezier(0.4, 0, 0.2, 1)
```
Font: Inter (Google Fonts, loaded in index.html)

## Constraints
- No UI libraries — build everything from scratch in CSS
- No TypeScript — plain JSX only
- No Tailwind — all styles in `src/index.css`
- Keep all styles in the single `src/index.css` file
- Images stored as base64 data URLs in content.json (keep under 1MB)
- GitHub token needed for pushes — user generates from github.com/settings/tokens with `repo` scope
