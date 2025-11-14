# Budget App (Next.js) — Roadmap Pembaruan UI/UX Terpadu

_Status: Draft v1.2 · Bahasa kerja: Indonesia/English campuran_  
_Sumber: Sintesis dokumen internal & masukan terbaru (Nov 2025, pasca receipt + timezone update)_

---

## 🎯 Sasaran, Prinsip, dan Metrik Keberhasilan

**Goal UX ringkas** (prioritas tinggi, dapat diukur):

- Tambah transaksi ≤ 2 klik dari halaman mana pun.
- Temukan transaksi yang spesifik (dengan filter) ≤ 10 detik.
- Pantau burn-rate & saldo aman tanpa berpindah lebih dari 1 halaman.

**North-star metrics (monitor per sprint):**

- 90% pengguna baru menuntaskan "Add first transaction" di sesi perdananya.
- Waktu rata-rata menemukan transaksi turun ≥ 30% setelah perbaikan filter.
- Skor kepuasan mobile ≥ 4/5 pasca refaktor responsif.
- Retensi mingguan naik 15% tiga bulan setelah onboarding diperbarui.

**Prinsip desain yang harus dijaga:**

- **Hierarki jelas**: angka keuangan dan KPI tampil paling menonjol, konteks menyusul.
- **Satu sumber periode global**: semua halaman sinkron dengan period switcher.
- **Konsistensi komponen**: gunakan design tokens & sistem komponen bersama (Tailwind + shadcn/ui/Radix).
- **Aksesibilitas WCAG AA**: kontras, fokus ring, ikon berlabel.
- **Mobile-first**: bottom navigation + FAB, target sentuh ≥ 44 px.
- **Performa**: RSC, cache, dan virtualisasi tabel sehingga 1.000+ baris tetap responsif.

---

## 🔍 Snapshot Temuan Saat Ini

- Tema gelap & tipografi stabil; aksi sekunder perlu hierarki visual agar tidak tenggelam.
- Overview masih memakai KPI placeholder—angka belum tersambung ke Supabase summary pipeline.
- Empty/loading states sebagian sudah skeleton, namun beberapa modul (reports, budgets) masih placeholder tanpa CTA.
- Filter transaksi sudah menampilkan chips aktif dan edit modal timezone-safe, tetapi belum ada preset yang bisa disimpan.
- Layout desktop matang; mobile masih menunggu bottom nav + FAB untuk memenuhi target dua klik.
- Receipt review dan toast mobile offset sudah solid; berikutnya fokus memberi jalan pintas dari receipt ke transaksi.
- Onboarding checklist belum tersedia; pengguna baru masih menebak langkah pertama.

---

## 🧭 Informasi Arsitektur & Navigasi

- **Sidebar kiri** (desktop) untuk Overview, Transactions, Budgets, Reports, Accounts, Receipt scanning, Imports, Settings.
- **Header kanan**: quick actions (Tambah transaksi, Scan struk, Transfer) + period switcher global (This month, Last month, Custom).
- **Mobile**: bottom tab (Overview, Transaksi, Anggaran, Akun) + FAB “+” mengarahkan ke sheet aksi cepat.
- Breadcrumb tidak diperlukan (kedalaman dangkal); gunakan page header + tabs/filter.
- Breakpoint adaptif: sidebar → bottom nav pada lebar < `md` (gunakan utilitas `sm:hidden`, `md:flex`, dsb.).
- FAB kontekstual: Overview → “Tambah transaksi”, Budgets → “Tambah budget”, lainnya → menu aksi cepat. Gunakan slide-over (Radix Dialog/Sheet) agar ergonomis di layar kecil.

---

## 🎨 Design System & Teknologi

**Tokens inti (dark mode contoh):**

```css
:root {
  --bg: #0b0f14;
  --surface: #121821;
  --muted: #1a2230;
  --border: #243246;
  --text: #e6edf7;
  --subtext: #a8b3c7;
  --positive: #2bb673;
  --warning: #e6a700;
  --danger: #e05252;
  --link: #6aa9ff;

  /* Semantic layer */
  --card-bg: var(--surface);
  --card-border: var(--border);
  --cta-bg: var(--link);
  --cta-hover: color-mix(in srgb, var(--link) 80%, white 20%);
  --fab-bg: var(--link);
  --fab-text: #070a0f;

  /* Elevation */
  --elevation-1: 0 4px 16px rgba(8, 13, 20, 0.2);
  --elevation-2: 0 10px 30px rgba(8, 13, 20, 0.35);
}
```

- Skala tipografi Inter/Plus Jakarta Sans, `font-variant-numeric: tabular-nums` untuk angka.
- Spasi 4/8 pt (2–48), radius kartu 10–12 px, tombol 8 px.
- Fokus ring (`focus-visible:ring`) wajib di tiap kontrol; ikon aksi memiliki `aria-label` dan tooltip Radix.
- Angka & tanggal diformat via `Intl` (`id-ID`, currency IDR). Multi-bahasa gunakan `next-intl`.

**Stack & tooling:** Next.js App Router (RSC + Suspense), Tailwind CSS + design tokens, shadcn/ui & Radix UI, TanStack Table + virtualization, Recharts (sparkline), Storybook, ESLint `jsx-a11y`.

---

## 📄 Pola Halaman & Konteks Fitur

### Overview

- Page header + period switcher sinkron global.
- Metric cards besar (Net Cashflow, Spent so far, Budget Burn, optional Safe-to-spend) dengan sparkline 30 hari, delta VS periode sebelumnya, dan CTA “View reports”.
- “Budgets on watch” (≥80%) dengan progress bar & estimasi hari menuju limit.
- “Accounts snapshot” menampilkan saldo & tren mini; tombol cepat filter transaksi akun.
- Insight rule-based ringan (contoh: “Pengeluaran groceries turun 15% minggu ini”).

### Transactions

- Sticky filter bar permanen: Search, Periode (preset + kalender), Akun, Kategori, Tipe, Currency.
- Chips filter aktif berada di bawah header dengan tombol “Clear all”.
- Grouping berdasarkan tanggal (header sticky) + subtotal opsional.
- Kolom amount right-align tabular, warna semantik; badge kategori berikon.
- Bulk actions muncul saat multi-select (kategori massal, hapus, link ke transfer/struk) + toast undo.
- Running balance panel saat filter 1 akun aktif.
- TanStack Table + `react-virtual` untuk performa, sticky header & kolom aksi.

### Receipt Scanning

- Drag & drop + tombol “Ambil dari kamera”.
- State progres jelas (Uploading → Scanning → Extracting → Ready) dengan feedback error.
- Layout dua kolom: kiri preview gambar, kanan hasil OCR yang dapat diedit.
- CTA “Buat transaksi” membuka modal transaksi pre-filled.
- Confidence & warnings ditampilkan dalam badge.

### Accounts

- Kartu akun: saldo, delta bulan ini, sparkline, aksi cepat (Transfer, Add funds) dan link ke transaksi akun.
- Diagram distribusi saldo antar akun (donut/bar) dengan total di tengah.

### Budgets

- Grid kartu budget dengan progress, status warna (ok/warn/danger), burn-rate by day ("Hari ke-N, seharusnya ≤ RpX").
- Safe-to-spend agregat opsional + link “View trends” membuka grafik histori.

### Reports

- Tabs: Spending Trends, Category Breakdown, Cashflow Over Time.
- Empty state edukatif + CTA (Tambah transaksi, Buat budget) bila data kosong.
- Ekspor PNG/CSV; mengikuti period switcher.

### Imports & Settings

- Wizard CSV 4 langkah (Upload → Map → Preview/Dedupe → Confirm) + preset mapping per bank.
- Settings: tema (dark/light), locale & currency default, integrasi (Google Sheets, e-wallet), backup/restore.

---

## 🛠️ Implementasi Teknis & Aksesibilitas

- Gunakan Server Components untuk agregat (cashflow, budget) + cache per kombinasi periode/filter.
- Suspense + skeleton placeholders (tidak lagi dashed box kosong).
- Prefetch data saat hover menuju halaman utama.
- Validasi kontras otomatis (lint + alat design).
- Keyboard navigation & focus trap untuk dialog/filter modal.

---

## 📅 Roadmap Eksekusi (12 Minggu, Sprint 2 Minggu)

### Milestone 1 — Foundations (Sprint 1–2)

- Implementasi design tokens & theme switch (dark/light) + audit Tailwind utilities.
- Global period switcher aktif; mempengaruhi Overview, Transactions, Budgets, Reports (via query/permalink).
- Redesain metric cards dengan sparkline, delta, helper tooltip.
- Empty state & loading skeleton komponen reusable + CTA standar.

### Milestone 2 — Transactions Experience (Sprint 3–4)

- Sticky filter bar + chips + quick clear _(chips aktif sudah live; preset & bulk actions masih on-going)_.
- Saved filter preset (This month, Last 30 days, Custom) & running balance panel.
- Table upgrade: grouping per tanggal, sortable headers, sticky action column, bulk actions dengan toast undo.

### Milestone 3 — Onboarding & Guidance (Sprint 5–6)

- Onboarding checklist panel (buat akun, upload struk, set budget) + progressive hints.
- Quick actions pada overview cards dan FAB kontekstual.
- Inline helper tooltip untuk metrik & field penting.

### Milestone 4 — Receipts + Budgets & Accounts (Sprint 7–9)

- Receipt scanning: dropzone + kamera, state progres, preview dua kolom, CTA create transaction _(upload + review shipped; CTA create transaction dan re-scan flow berikutnya)_.
- Budget grid dengan burn-rate by day, safe-to-spend ringkasan.
- Accounts cards interaktif + diagram distribusi saldo.

### Milestone 5 — Reports & Delight (Sprint 10–12)

- Tabs reports + ekspor PNG/CSV, insight otomatis sederhana.
- Guided tour (spotlight) untuk fitur baru, animasi halus (respect reduced motion).
- Eksperimen customizable dashboard widgets (drag/ collapse) bila kapasitas memungkinkan.

**Penelitian UX**: sesi uji coba cepat di akhir Milestone 2 & 4 untuk validasi navigasi + flows.

---

## 📌 Komponen Reusable (cuplikan kode)

### Format utilitas

```ts
// lib/format.ts
export const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtDateID = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
```

### Metric card

```tsx
// components/metric-card.tsx
type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  trend?: "up" | "down" | "flat";
  rightSlot?: React.ReactNode;
};

export function MetricCard({
  label,
  value,
  subtext,
  trend,
  rightSlot,
}: MetricCardProps) {
  const trendDot =
    trend === "up"
      ? "bg-[var(--positive)]"
      : trend === "down"
      ? "bg-[var(--danger)]"
      : "bg-[var(--border)]";

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5"
      aria-label={label}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[var(--subtext)]">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${trendDot}`}
          />
          <span className="text-sm">{label}</span>
        </div>
        {rightSlot}
      </header>
      <div className="mt-2 text-2xl md:text-3xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </div>
      {subtext && (
        <p className="mt-1 text-xs text-[var(--subtext)]">{subtext}</p>
      )}
    </section>
  );
}
```

### Budget progress dengan burn-rate

```tsx
// components/budget-progress.tsx
import { fmtIDR } from "@/lib/format";

type Props = {
  spent: number;
  budget: number;
  dayOfMonth: number;
  daysInMonth: number;
};

export function BudgetProgress({
  spent,
  budget,
  dayOfMonth,
  daysInMonth,
}: Props) {
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const expected = (dayOfMonth / daysInMonth) * budget;
  const status: "ok" | "warn" | "danger" =
    spent <= expected * 0.9
      ? "ok"
      : spent <= expected * 1.1
      ? "warn"
      : "danger";

  const color =
    status === "ok"
      ? "bg-[var(--positive)]"
      : status === "warn"
      ? "bg-[var(--warning)]"
      : "bg-[var(--danger)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex justify-between text-sm text-[var(--subtext)]">
        <span>Terpakai</span>
        <span className="tabular-nums">
          {fmtIDR(spent)} / {fmtIDR(budget)}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full rounded-full bg-[var(--muted)]">
        <div
          className={`h-2.5 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-[var(--subtext)]">
        Hari ke-{dayOfMonth} dari {daysInMonth}. Seharusnya ≤ {fmtIDR(expected)}.
      </div>
    </div>
  );
}
```

### Filter chips transaksi

```tsx
// components/filter-chips.tsx
"use client";

type Chip = { key: string; label: string; value: string };

export function FilterChips({
  chips,
  onRemove,
}: {
  chips: Chip[];
  onRemove: (key: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-sm"
        >
          <span className="text-[var(--subtext)]">{c.label}</span>
          <button
            className="text-[var(--subtext)] hover:text-[var(--text)]"
            aria-label={`Hapus filter ${c.label}`}
            onClick={() => onRemove(c.key)}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
```

---

## 🔁 Aktivitas Pendukung & Governance

- Figma design source of truth dengan token & komponen sinkron dengan implementasi React.
- Storybook untuk regress visual + A11y add-on.
- ESLint `jsx-a11y`, lint design tokens (no hard-coded warna spacing).
- UX research ringan setiap selesai Milestone 2 & 4 (usability test 5 pengguna / remote).
- Kanban 2 mingguan; design & engineering co-own backlog.

---

## ⚠️ Risiko & Mitigasi Singkat

- **Grouping transaksi & virtualisasi**: uji performa dataset besar; fallback pagination jika perlu.
- **Inkonistensi periode**: implement period switcher lebih dulu sebelum menambah insight lanjutan.
- **Beban grafik**: mulai dari sparkline kecil di Overview, grafik mendalam di Reports.

---

_Dokumen ini menjadi acuan PRD ringan & backlog grooming. Silakan turunkan menjadi tiket per sprint dengan effort estimasi._
