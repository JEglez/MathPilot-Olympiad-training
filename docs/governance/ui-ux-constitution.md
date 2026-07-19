# MathPilot — UI/UX Constitution

> Design system governance for all React/Tailwind UI code in `apps/web/`.
> Every rule here is enforced by the `mathpilot-codegen` agent.
> Changing any rule requires a PR with explicit justification.

---

## 1. Philosophy

**Functional Minimalism + Swiss Design + Accessibility-Core.**

- **Function first.** Every visual element must serve a purpose. No decoration for its own sake.
- **Clarity over cleverness.** A math olympiad audience values precision. Layouts must be legible at a glance.
- **Zero shadows. No neumorphism, glassmorphism, or brutalism.** Borders convey structure; shadows do not.
- **WCAG 2.2 AA is the floor**, not a nice-to-have. Contrast, focus rings, and touch targets are non-negotiable.
- **Mobile-first.** Design for a 375px viewport, then enhance for larger screens.

---

## 2. Design Tokens

All values come from `apps/web/src/styles/tokens.css` and `apps/web/src/styles/global.css`.
**Never hardcode a value that has a token.**

### 2.1 Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#0F172A` | Navigation background, primary text, dark CTAs |
| `--color-secondary` | `#475569` | Secondary actions, sub-headings |
| `--color-background` | `#F8F9FC` | Page backgrounds |
| `--color-card` | `#FFFFFF` | Card/panel surfaces |
| `--color-muted` | `#F1F5F9` | Muted backgrounds, filter pills |
| `--color-muted-foreground` | `#64748B` | Secondary text, placeholders |
| `--color-border` | `#E2E8F0` | All borders (1px only) |
| `--color-ring` | `#F59E0B` | Focus rings, active states, amber accent |
| `--color-teal` | `#F59E0B` | Amber brand accent (active states) |
| `--color-teal-dark` | `#D97706` | Amber hover states |
| `--color-destructive` | `#DC2626` | Error states, destructive actions |

#### Sidebar tokens (dark surface)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-sidebar` | `#0F172A` | Sidebar background |
| `--color-sidebar-foreground` | `rgba(255,255,255,0.55)` | Sidebar text |
| `--color-sidebar-active` | `#F59E0B` | Active nav item text |
| `--color-sidebar-active-bg` | `rgba(245,158,11,0.15)` | Active nav item background |

#### Taxonomy domain tag colours
| Domain | Text | Background |
|--------|------|------------|
| Number Theory | `#006096` | `#E3F2FD` |
| Geometry | `#527630` | `#EAF2E3` |
| Algebra | `#B45309` | `#FFF8E1` |
| Combinatorics | `#6B21A8` | `#F3E8FF` |

**Rule:** Do not invent domain tag colours. Use only the four above.

### 2.2 Typography

Font: **Plus Jakarta Sans** (primary), **Inter** (fallback), `system-ui` chain.

| Token | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem / 12px | Labels, chips, metadata |
| `text-sm` | 0.875rem / 14px | Body text, nav items |
| `text-base` | 1rem / 16px | Default body |
| `text-lg` | 1.125rem / 18px | Sub-headings |
| `text-xl` | 1.25rem / 20px | Page titles |
| `text-2xl` | 1.5rem / 24px | Problem titles |
| `text-3xl` | 1.875rem / 30px | Hero headings |

**Rules:**
- Use `font-bold` (700) for headings, `font-semibold` (600) for labels, `font-medium` (500) for interactive items.
- Never go below `text-xs` (12px). Smaller text fails accessibility contrast.
- Line height: `leading-relaxed` (1.625) for body prose, `leading-tight` (1.25) for headings.

### 2.3 Spacing

4px base module. Use Tailwind scale: `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `6` = 24px, `8` = 32px.

- **Page padding (mobile):** `px-4` (16px).
- **Page padding (desktop):** `px-6` (24px). Pattern: `px-4 sm:px-6`.
- **Card padding:** `p-4` or `p-5`.
- **Gap between list items:** `gap-2` or `space-y-2`.
- **Section spacing:** `mb-6` between major sections.

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded` / `rounded-lg` | 0.5rem (8px) | Buttons, cards, inputs |
| `rounded-xl` | 0.75rem (12px) | Feature cards, modals |
| `rounded-full` | 9999px | Pills, chips, avatar badges |

---

## 3. Responsive Design

**Mobile-first.** Write base styles for mobile, add `sm:`/`md:`/`lg:` overrides.

### 3.1 Breakpoints (Tailwind defaults)

| Prefix | Min-width | Target |
|--------|-----------|--------|
| *(none)* | 0px | Mobile phones (≥ 375px) |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets, landscape phones |
| `lg:` | 1024px | Small laptops |
| `xl:` | 1280px | Desktop |

### 3.2 Mandatory Responsive Rules

- **Sidebars** must be hidden on mobile and accessible via a toggle (hamburger/drawer). Never `fixed` without a mobile control.
- **Page horizontal padding:** always `px-4 sm:px-6` — never bare `px-6` alone.
- **Multi-column grids** must collapse to `grid-cols-1` at `md:` or below.
- **Sticky elements** with `top-0` must account for the mobile navigation bar height (52px). Use `top-[52px] md:top-0` when needed.
- **Overflow:** use `overflow-x-auto` on wide tables and math content. Scrollable containers must hide the scrollbar on mobile (`[&::-webkit-scrollbar]:hidden` or `scrollbar-width: none`).
- **Touch targets:** every interactive element (button, link, input) must be at least `44px × 44px`. Use `min-h-[44px]` or `py-3` to achieve this.

### 3.3 Navigation Pattern

- **Desktop:** fixed left sidebar (`w-56`, `ml-56` on main content).
- **Mobile:** hamburger button in a top bar → slide-in drawer overlay.
- The mobile top bar is `52px` tall and sits above page content.
- An overlay backdrop (`bg-black/50`) closes the drawer on tap.

---

## 4. Component Architecture

```
apps/web/src/
├── pages/          Route-level components (ProblemDetailPage, SearchPage…)
├── components/     Shared feature components (ProblemCard, ChatPanel…)
│   └── ui/         Pure UI primitives (Button, Badge, Input…)
├── hooks/          Custom React hooks
└── styles/         global.css, tokens.css
```

### 4.1 File Layout

Every component has **two co-located files**:

```
ComponentName.tsx         ← component logic
ComponentName.module.css  ← layout and responsive styles
```

Tailwind utility classes live in the `.tsx`. Complex responsive layouts and non-Tailwind overrides live in the `.module.css`.

### 4.2 Props

```typescript
// ✅ Readonly props interface, named export
export interface ProblemCardProps {
  readonly problem: Problem;
  readonly index?: number;
}

export function ProblemCard({ problem, index }: ProblemCardProps) { … }
```

- All props interfaces are `readonly`.
- Max 5 props; use an options object if more are needed.
- No default exports.

### 4.3 Event Handlers

- Name: `onVerbNoun` (e.g., `onTopicToggle`, `onPageChange`).
- Always typed: `(value: string) => void`, not `Function` or `any`.

---

## 5. Tailwind Usage Rules

This project uses **Tailwind CSS v4** with a custom `@theme` block in `global.css`.

### 5.1 Do

- Use Tailwind for **spacing, flex/grid layout, typography, and colours** that map directly to design tokens.
- Use responsive prefixes (`sm:`, `md:`) on classes that change at breakpoints.
- Use `cn()` (from `lib/utils`) to conditionally compose class strings.
- Use `data-testid` on every testable container element.

### 5.2 Do Not

- Do not use **arbitrary values** (e.g., `w-[237px]`, `text-[13px]`) unless unavoidable; prefer token-aligned values.
- Do not use **inline `style` props** for values that have a Tailwind class or CSS token equivalent.
- Do not use Tailwind for **complex responsive layout rules** — put those in a `.module.css` file.
- Do not mix `@apply` and utility classes in the same rule — pick one.
- Do not add `!important` overrides.

### 5.3 Inline Styles — Allowed Cases Only

Inline `style` props are **only** permitted for:
1. **Dynamic values** computed from data (e.g., a color derived from a domain tag).
2. **CSS custom properties** (`style={{ "--sidebar-width": "56px" }}`).
3. Rapid prototyping (must be replaced with tokens before merge).

---

## 6. CSS Modules

### 6.1 Rules

- One `.module.css` per component. File name mirrors the component: `ProblemCard.module.css`.
- Class names: `camelCase` inside `.module.css`, matching `.className` usage.
- No nesting beyond one level deep.
- Always include a `@media (max-width: 768px)` block when a component has multi-column layout.

### 6.2 Template for a Responsive Layout Module

```css
/* ComponentName.module.css */

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.sidebar {
  position: sticky;
  top: 72px;   /* topbar height + gap */
}

/* ── Mobile ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
```

---

## 7. Accessibility

- **Colour contrast:** minimum 4.5:1 for body text, 3:1 for large text and UI components (WCAG 2.2 AA).
- **Focus rings:** always visible. Use `focus-visible:ring-2 focus-visible:ring-[#F59E0B]` on interactive elements. Never `outline: none` without a replacement.
- **Keyboard navigation:** all interactive elements reachable via Tab. Modals/drawers trap focus.
- **ARIA labels:** every icon-only button must have `aria-label`. Hidden decorative elements use `aria-hidden`.
- **Semantic HTML:** use `<nav>`, `<main>`, `<aside>`, `<section>`, `<article>`, `<h1>`–`<h6>` correctly. Do not use `<div>` for interactive elements — use `<button>` or `<a>`.
- **Reduced motion:** respect `prefers-reduced-motion` (already handled globally in `global.css`).
- **Touch targets:** 44 × 44px minimum. Increase padding, not the visual size.

---

## 8. LaTeX / Math Rendering

- All LaTeX is rendered via the shared `renderLatexToHtml()` utility (`apps/web/src/utils/render-latex.ts`).
- **Never call KaTeX directly** in feature or page code. Always go through the shared utility.
- Math containers must have `overflow-x: auto` to handle wide equations on small screens.
- The `katex-display` class in `global.css` already applies `overflow-x: auto` to display-mode math.
- Use `dangerouslySetInnerHTML` only with the output of `renderLatexToHtml()` — never with raw user input.

---

## 9. Animation & Motion

- **Micro-interactions only.** Transitions on hover/focus state changes: `transition-colors`, `transition-opacity`. Max duration: `200ms`.
- **No page-level animations.** No enter/exit animations for route changes.
- **Loading states:** use `animate-pulse` (Tailwind) on skeleton placeholders. Never use spinners that rotate indefinitely without a timeout.
- All animation durations are overridden to `0.01ms` when `prefers-reduced-motion: reduce` is set (global.css).

---

## 10. Forms & Inputs

- Every `<input>` and `<textarea>` has a visible label or `aria-label`.
- Focus state: amber border + subtle box shadow (`0 0 0 3px rgba(245,158,11,0.1)`).
- Error state: `border-destructive` + error message below the field (not a tooltip).
- Use `disabled` attribute (not just styling) on truly disabled controls.
- Number inputs for year ranges: `min` and `max` attributes required.

---

## 11. CodeGen Rules (for `mathpilot-codegen` agent)

When the `react-component` template is used, the generated code **must**:

1. Create both `ComponentName.tsx` and `ComponentName.module.css`.
2. Include a `@media (max-width: 768px)` block in the CSS module.
3. Use `px-4 sm:px-6` for horizontal page padding (never bare `px-6`).
4. Set `min-h-[44px]` or equivalent on all generated buttons/links.
5. Add `aria-label` to any icon-only button.
6. Add `data-testid="${kebab-case-name}"` on the root element.
7. Use `cn()` for conditional classes.
8. Export a named `interface ${Name}Props` with `readonly` fields.
9. Never hardcode a colour — use tokens or Tailwind colour classes that map to the theme.
10. Never output a `<div onClick>` — use `<button type="button">` for interactive elements.

---

## 12. Violations Checklist

Before submitting a PR, verify:

- [ ] All paddings use responsive pattern `px-4 sm:px-6` (not bare `px-6`)
- [ ] No fixed sidebar or panel without a mobile toggle
- [ ] Every grid collapses to single column at `md:` or below
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] No hardcoded hex colours outside of tokens or inline-style dynamic values
- [ ] No `outline: none` without a replacement focus indicator
- [ ] LaTeX rendered via `renderLatexToHtml()` only
- [ ] CSS Modules have a mobile media query block if layout uses columns

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-07-18 | Initial UI/UX constitution | MathPilot team |
