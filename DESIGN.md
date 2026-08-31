# VAPING SHOP - Design System

## Brand Identity

**ร้านขายพอตเปลี่ยนหัวและพอตใช้แล้วทิ้ง** - Premium e-cigarette shop with a modern, dark aesthetic.

### Design Philosophy

- **Dark Luxury** - พื้นหลังสีเข้มให้ความรู้สึกพรีเมียม
- **Neon Accent** - สีเขียวนีออน (Acid Lime) สร้างจุดเด่น
- **Vapor Aesthetic** - ผสมผสานธีมม่วง-เขียวสร้างบรรยากาศ
- **Smooth Interactions** - Animation นุ่มนวล ไม่รบกวนผู้ใช้

---

## Color System

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Acid Lime** | `#d4ff14` | CTAs, highlights, active states |
| **Acid Glow** | `#ccff00` | Hover states, glows |
| **Acid Muted** | `#a3cc00` | Secondary accents |

### Vapor Colors (Purple Family)

| Name | Hex | Usage |
|------|-----|-------|
| **Vapor Purple** | `#7928ca` | Secondary accents |
| **Vapor Violet** | `#5b13ec` | Cards, borders, glows |
| **Vapor Deep** | `#3b0764` | Background gradients |
| **Vapor Glow** | `#9d4edd` | Lighter accents |

### Background Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Void** | `#06040a` | Main background (darkest) |
| **Dark** | `#0a0712` | Section backgrounds |
| **Surface** | `#120d20` | Cards, elevated surfaces |
| **Surface Hover** | `#1b1430` | Hover states |
| **Card** | `#140e24` | Card backgrounds |

### Border Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Border** | `#281d45` | Default borders |
| **Border Light** | `#3b2b64` | Highlighted borders |

---

## Typography

### Font Stack

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Font Sizes

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| **Display** | `text-7xl/8xl` | `font-black` | Hero headlines |
| **H1** | `text-5xl` | `font-black` | Section titles |
| **H2** | `text-3xl` | `font-bold` | Card titles |
| **H3** | `text-lg` | `font-bold` | Sub-sections |
| **Body** | `text-base` | `font-normal` | Paragraphs |
| **Small** | `text-sm` | `font-medium` | Descriptions |
| **Label** | `text-xs` | `font-mono` | Tags, badges |

### Text Colors

| Name | Class | Usage |
|------|-------|-------|
| Primary | `text-white` | Main text |
| Secondary | `text-white/80` | Secondary text |
| Muted | `text-white/50` | Descriptions |
| Dimmed | `text-white/30` | Disabled, strikethrough |

---

## Spacing

### Grid System

- **Container max-width**: `max-w-7xl` (1280px)
- **Section padding**: `py-20 px-4`
- **Card padding**: `p-5` to `p-6`
- **Gap**: `gap-4` to `gap-6`

### Responsive Breakpoints

| Breakpoint | Prefix | Width |
|------------|--------|-------|
| Mobile | default | < 640px |
| Small | `sm:` | ≥ 640px |
| Medium | `md:` | ≥ 768px |
| Large | `lg:` | ≥ 1024px |
| Extra Large | `xl:` | ≥ 1280px |

---

## Components

### Cards (`.vapor-card`)

```html
<div class="vapor-card rounded-2xl p-5">
  <!-- Content -->
</div>
```

**States:**
- Default: `bg-brand-surface border-brand-border`
- Hover: `border-vapor-violet shadow-card-glow`
- Active: `border-acid-lime/50`

### Buttons

#### Primary (`.btn-acid`)

```html
<a class="btn-acid px-8 py-4 rounded-full font-extrabold">
  Call to Action
</a>
```

**Visual:**
- Background: `#d4ff14`
- Color: `#06040a`
- Shadow: `0 0 20px rgba(212, 255, 20, 0.4)`
- Hover: Lighter background + lift + stronger glow

#### Secondary (`.btn-vapor-outline`)

```html
<a class="btn-vapor-outline px-8 py-4 rounded-full font-semibold">
  Secondary Action
</a>
```

**Visual:**
- Background: `rgba(91, 19, 236, 0.1)`
- Border: `#5b13ec`
- Hover: Border changes to acid-lime

### Glass Effect (`.vapor-glass`)

```html
<div class="vapor-glass rounded-2xl">
  <!-- Frosted glass content -->
</div>
```

Used for: Navigation header, floating panels

---

## Shadows & Glows

### Box Shadows

| Name | Value | Usage |
|------|-------|-------|
| `shadow-acid` | `0 0 25px -5px rgba(212, 255, 20, 0.4)` | Buttons, highlights |
| `shadow-acid-sm` | `0 0 12px -2px rgba(212, 255, 20, 0.3)` | Small accents |
| `shadow-vapor` | `0 0 35px -5px rgba(91, 19, 236, 0.4)` | Cards, panels |
| `shadow-card-glow` | `0 8px 32px 0 rgba(91, 19, 236, 0.15)` | Card hover |

### Text Glow

| Class | Usage |
|-------|-------|
| `.text-glow-acid` | Neon green text glow |
| `.text-glow-violet` | Purple text glow |

---

## Gradients

### Background Gradients

```css
/* Vapor glow - hero background */
bg-vapor-glow

/* Acid gradient - accent elements */
bg-acid-gradient

/* Purple gradient - buttons, badges */
bg-purple-gradient

/* Dark gradient - page background */
bg-dark-gradient
```

### Radial Glows

Used for ambient lighting effects in Hero:

```html
<!-- Purple glow -->
<div class="absolute w-[850px] h-[550px] bg-vapor-violet/25 rounded-full blur-[140px]"></div>

<!-- Acid accent -->
<div class="absolute w-[400px] h-[350px] bg-acid-lime/15 rounded-full blur-[120px]"></div>
```

---

## Animations

### Built-in Animations

| Name | Duration | Usage |
|------|----------|-------|
| `pulse-slow` | 4s | Status indicators |
| `float-slow` | 6s | Floating elements |

### Transition Presets

| Name | Value | Usage |
|------|-------|-------|
| Default | `transition-all duration-300` | General use |
| Fast | `transition-all duration-200` | Buttons |
| Slow | `transition-all duration-500` | Images |

### Hover Effects

```css
/* Card lift */
.vapor-card:hover {
  transform: translateY(-2px);
}

/* Button lift */
.btn-acid:hover {
  transform: translateY(-2px);
}

/* Icon scale */
.group:hover .icon {
  transform: scale(1.1);
}
```

---

## Best Practices

### Do ✅

1. **ใช้ CSS classes ที่กำหนดไว้** - `vapor-card`, `btn-acid`, `vapor-glass`
2. **รักษา contrast ratio** - สีเขียวบนพื้นม่วง/ดำ อ่านง่าย
3. **ใส่ hover states** - ทุก interactive element ต้องมี feedback
4. **ใช้ rounded-2xl** - Consistent border radius ทั่วทั้ง site
5. **จำกัดจำนวน colors** - ใช้ Acid Lime สำหรับจุดเด่นเท่านั้น

### Don't ❌

1. **อย่าใช้สีสันสดใสเกินไป** - รักษา dark luxury aesthetic
2. **อย่าลืม backdrop-filter** - จำเป็นสำหรับ glass effects
3. **อย่าใช้ box-shadow มากเกินไป** - อาจทำให้ page หนัก
4. **อย่า override default transitions** - ใช้ที่มีอยู่แล้ว

---

## Component Examples

### Product Card

```tsx
<Link href={`/products/${product.id}`} className="group block">
  <div className="vapor-card rounded-2xl overflow-hidden group-hover:border-acid-lime/50 transition-all">
    {/* Image */}
    <div className="relative aspect-square">
      <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      {/* Discount badge */}
      {product.originalPrice && (
        <div className="absolute top-3 left-3 bg-acid-lime text-black text-xs font-black px-2.5 py-1 rounded-md">
          -{discount}%
        </div>
      )}
    </div>
    {/* Content */}
    <div className="p-5">
      <h3 className="text-white font-bold group-hover:text-acid-lime transition-colors">
        {product.name}
      </h3>
      <div className="text-acid-lime text-2xl font-black">{product.price}฿</div>
    </div>
  </div>
</Link>
```

### Section Header

```tsx
<div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
  <div>
    <div className="text-acid-lime text-xs font-mono tracking-widest uppercase mb-2">
      SECTION LABEL
    </div>
    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
      หัวข้อส่วน
    </h2>
  </div>
  <p className="text-white/50 text-sm">คำอธิบายส่วน</p>
</div>
```

---

## Responsive Design

### Mobile-First Approach

1. **Default styles สำหรับ mobile**
2. **ใช้ `sm:`, `md:`, `lg:` สำหรับ breakpoints ที่ใหญ่ขึ้น**
3. **Navigation: Hamburger menu บน mobile, horizontal บน desktop**
4. **Grid: 1 column → 2 columns → 4 columns**

### Key Breakpoint Patterns

```css
/* Text sizing */
text-3xl md:text-5xl

/* Grid columns */
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4

/* Flex direction */
flex-col sm:flex-row

/* Visibility */
hidden lg:block
```