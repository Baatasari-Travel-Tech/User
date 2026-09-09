# Baatasari — Design Tokens

> Single source of truth for **colors, typography, layout & spacing**.
> All tokens live as CSS custom properties in [`app/globals.css`](app/globals.css)
> and are mapped into Tailwind via `@theme inline`. Change a token here → re-themes the whole app.
>
> Light theme only (no `.dark` block yet). Many colors are authored in **OKLCH**.

---

## 1. Colors

### 1.1 Brand
| Token | Value | Role |
|-------|-------|------|
| `--brand-navy` | `#0C1D37` | Primary brand · text · primary buttons |
| `--brand-navy-hover` | `rgba(12,27,51,0.9)` | Primary button hover |
| `--brand-blue` | `#2B4570` | Secondary brand blue |
| `--brand-deep-blue` | `#122848` | Active states · category chips |
| `--royal-blue` | `#1F4FD8` | Accent · interactive highlight |
| `--navy-800` | `#1A2E4A` | Navy step |
| `--navy-900` | `#0C1D37` | Navy step (= brand-navy) |

### 1.2 Surfaces / canvas
| Token | Value | Role |
|-------|-------|------|
| `--background` | `#F5EFE4` | App canvas (warm cream) |
| `--foreground` | `#0C1D37` | Default text |
| `--nav` | `#FAF9F6` | Top navigation surface |
| `--white` | `#FFFFFF` | — |
| `--black` | `#000000` | — |

### 1.3 Gold accent (NewDesign theme)
| Token | Value |
|-------|-------|
| `--gold` | `#C2962E` |
| `--gold-text` | `#8A7136` |
| `--gold-icon` | `#A98B4F` |
| `--gold-bar-bg` | `#FAF6EC` |
| `--gold-bar-border` | `#E7DDC9` |
| `--gold-soft-bg` | `#F0E8D8` |
| `--gold-soft-border` | `#E3D9C4` |

### 1.4 Semantic UI tokens (shadcn · OKLCH)
Drive every primitive (Button, Card, Input, Dialog…). Each has a `*-foreground` pair.

| Token | Value (OKLCH) |
|-------|---------------|
| `--card` / `--card-foreground` | `1 0 0` / `0.145 0 0` |
| `--popover` / `--popover-foreground` | `1 0 0` / `0.145 0 0` |
| `--primary` / `--primary-foreground` | `0.205 0 0` / `0.985 0 0` |
| `--secondary` / `--secondary-foreground` | `0.97 0 0` / `0.205 0 0` |
| `--muted` / `--muted-foreground` | `0.97 0 0` / `0.556 0 0` |
| `--accent` / `--accent-foreground` | `0.97 0 0` / `0.205 0 0` |
| `--destructive` / `--destructive-foreground` | `0.577 0.245 27.325` / `0.985 0 0` |
| `--border` | `0.922 0 0` |
| `--input` | `0.922 0 0` |
| `--ring` | `0.708 0 0` |

**Sidebar set:** `--sidebar`, `--sidebar-foreground`, `--sidebar-primary(-foreground)`,
`--sidebar-accent(-foreground)`, `--sidebar-border`, `--sidebar-ring` (same OKLCH family).

### 1.5 Charts
| Token | Value | |
|-------|-------|---|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | orange |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | teal |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | blue |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | yellow |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | gold |
| `--revenue-color` | `#2563EB` | revenue series |

### 1.6 Foundation palette
**Gray:** `--gray-50 #F9FAFB` · `100 #F3F4F6` · `200 #E5E7EB` · `300 #D1D5DB` ·
`400 #9CA3AF` · `500 #6B7280` · `600 #4B5563` · `700 #374151` · `800 #1F2937` · `900 #111827`
**Zinc:** `50 #FAFAFA` · `400 #A1A1AA` · `950 #09090B`
**Slate:** `200 #E2E8F0` · `700 #334155`
**Blue:** `50 #EFF6FF` · `100 #DBEAFE` · `200 #BFDBFE` · `500 #3B82F6` · `600 #2563EB` · `900 #1E3A8A`
**Green:** `100 #DCFCE7` · `700 #15803D`
**Orange:** `100 #FFEDD5` · `700 #C2410C`
**Purple:** `--purple-soft-bg #EEE9FF` · `--purple-soft-text #6B5CE7`
**Blue soft:** `--blue-soft #3A5F94` · `--blue-soft-light #6383B1`

### 1.7 Glass / category (glassmorphism)
| Token | Value |
|-------|-------|
| `--glass-bg` | `white 70%` mix |
| `--glass-border` | `white 40%` mix |
| `--glass-soft-bg` | `white 50%` mix |
| `--category-active-bg` | `--brand-deep-blue` |
| `--category-inactive-text` | `--gray-600` |
| `--category-hover-text` | `--black` |
| `--live-dot-soft` / `--live-dot-solid` | `--green-100` / `--green-700` |

> **Feature-scoped namespaces** (themed per surface, derived from the above):
> `--hero-*`, `--events-*`, `--upcoming-*`, `--talent-*`, `--artist-*`, `--stall-*`,
> `--movie-card-*`. See `globals.css` §6–§12 for full lists.

---

## 2. Typography

Five Google fonts loaded in [`app/layout.tsx`](app/layout.tsx) as CSS variables.

| Font | Variable / class | Weights | Role |
|------|------------------|---------|------|
| **Bricolage Grotesque** | `--font-bricolage` · `.font-bricolage` | 400–800 | **All `<h1>`** (display) |
| **Albert Sans** | `--font-albert` · `.font-albert` | 400–700 | **Body + h2–h6** (default sans) |
| **Poppins** | `--font-poppins` · `.font-poppins` | 400–700 | Accent surfaces |
| **Inter** | `--font-inter` · `.font-inter` | variable | Utility / UI |
| **Sora** | `--font-sora` | 400–700 | Available (lightly used) |

**Theme mapping**
```
--font-sans: var(--font-albert), "Albert Sans", system-ui, sans-serif;
--font-mono: "Geist Mono", "Geist Mono Fallback";
```

**Hierarchy rules** (`@layer base`)
- `body` → Albert Sans
- `h1` → Bricolage Grotesque
- `h2, h3, h4, h5, h6` → Albert Sans

**Text style helpers**
| Class | Style |
|-------|-------|
| `.text-section-title` | `text-base font-semibold`, color `--blue-900` |
| `.text-stat-label` | `text-sm text-gray-700` |
| `.text-stat-value` | `text-3xl font-bold text-gray-900` |
| `.analytics-title` | `text-xl font-bold` `#284878` |

---

## 3. Layout

| Token / class | Value | Notes |
|---------------|-------|-------|
| `.page-x` | `max-w-[1400px]`, centred | Std page container |
| `.page-x` padding | `px-4` → `sm:px-6` → `lg:px-10` | Responsive gutters |
| Breakpoints | Tailwind defaults (`sm/md/lg/xl`) | Mobile-first |
| Scrollbar | 6px thin, translucent slate | Custom `::-webkit-scrollbar` + `scrollbar-width` |

---

## 4. Spacing & shape

### 4.1 Radius
Base `--radius: 0.625rem` (10px). Scale derived via `@theme inline`:

| Token | Calc | ~px |
|-------|------|-----|
| `--radius-sm` | `radius − 4px` | 6px |
| `--radius-md` | `radius − 2px` | 8px |
| `--radius-lg` | `radius` | 10px |
| `--radius-xl` | `radius + 4px` | 14px |
| `--radius-2xl` | `radius + 8px` | 18px |
| `--radius-3xl` | `radius + 12px` | 22px |
| `--radius-4xl` | `radius + 16px` | 26px |

- **Buttons (`.btn-*` utilities):** fully pill — `rounded-full`.
- **shadcn `<Button>` / `<Input>`:** `rounded-md`.
- **Badges:** `rounded-full`.

### 4.2 Spacing
Spacing uses **Tailwind's default scale** (`gap-*`, `p-*`, `m-*`, `space-*`) — no custom
spacing tokens are defined. Common rhythm in components: `gap-2/4`, section padding via
`.page-x`, control heights `h-8` (sm) / `h-10` / `h-12` (lg).

### 4.3 Shadows (inline, representative)
| Use | Value |
|-----|-------|
| Card / movie-card | `0 1px 2px (black 6%)` |
| Hero container | `0 10px 30px -10px rgba(0,0,0,0.05)` |
| Hero search | `0 4px 20px -5px rgba(0,0,0,0.08)` |
| Talent form shell | `0 34px 90px (brand-navy 10%)` |
| Chart tooltip | `shadow-lg` + `border-gray-200` |

### 4.4 Motion
| Token | Value |
|-------|-------|
| `tooltipFade` keyframe | `0.22s cubic-bezier(0.16, 1, 0.3, 1)` |
| Button press | `active:scale-95` |
| Default transition | `transition-colors` / `transition-all` |

---

*Source: [`app/globals.css`](app/globals.css), [`app/layout.tsx`](app/layout.tsx). Light theme only.*
