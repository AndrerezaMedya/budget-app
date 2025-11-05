# Budgeting App Usage Guide

Welcome to your personal finance workspace. This guide walks you through every area of the app, explains key workflows, and shares a few tips so you can get the most from the experience on both desktop and mobile.

## Getting Started

1. **Sign in** – Use the Supabase-authenticated sign-in page. After successful authentication you land on the **Overview** dashboard.
2. **Create your first account** – Navigate to **Accounts** and add accounts representing banks, cash, credit cards, or envelopes. Opening balances are stored in minor units (multiply the displayed amount by 100 in the database).
3. **Seed categories (optional)** – If you imported the provided seed data, categories already exist. Otherwise, create categories via **Settings → Categories** before budgeting.

> 💡 Tip: Every major feature lives under `/app/*`. The sidebar is collapsible on mobile; use the hamburger icon in the header.

## Overview

- Snapshot of combined cashflow, budget burn, and balances.
- Tiles update automatically after transactions roll in or budgets change.
- Use this page to confirm data synced after imports or manual entries.

## Transactions

- **Add** – Click *Add transaction*, choose type (expense, income, transfer), fill in fields, and submit.
  - Transfers require both source and destination accounts.
  - Add new payees inline or select existing ones.
  - Tag transactions for granular reporting.
- **Edit/Delete** – Inline actions (three-dot menu) allow modifications or removal.
- **Filter/Search** – Use the search input, account filter, and date range controls to drill down.

> ✅ Tip: When editing tags, a hidden input stores the selected IDs. Reset happens automatically after successful submission.

## Accounts

- Create, edit, archive, or reactivate accounts.
- Opening balances can be adjusted later (changes revalidate affected pages).
- Account cards display current balance and recent activity.

> 🔁 Tip: Use archive instead of delete for dormant accounts so historical transactions remain intact.

## Budgets

- Define monthly limits per category.
- Budget cards show amount spent, remaining balance, and burn rate.
- Adjust budgets inline; deletions revalidate overview and reports.

> 📈 Tip: Track overspending trends by watching the burn indicator—values over 100% signal you exceeded the limit.

## Reports

- Visualize expense trends, income vs. expense, and account balance history.
- Apply tag and category filters to see custom slices.
- Use the date range picker for month, quarter, or custom period views.

## Imports

- Upload CSV exports from banks or other tools.
- Map columns to app-friendly fields before import.
- Download a CSV template if you need a starting point.

> 📥 Tip: Validate your CSV locally before upload (check for UTF-8 encoding and consistent column headers) to avoid ingestion errors.

## Settings

- Manage profile, workspace preferences, category tree, and integrations.
- Use *Add category* to create parent or nested categories; optional icon and color fields help with visual organisation.
- Theme toggle lives in the global header for quick light/dark switching.
- Sign out from either the sidebar card or the header icon (changes persist across sessions).

## Mobile Experience

- Buttons and forms collapse to full width on small screens.
- Scroll the sidebar after opening it via the hamburger icon.
- Transactions sheet and other forms use responsive padding to remain readable in portrait orientation.

## Troubleshooting & Tips

- **Sync issues** – Refresh the page to revalidate server data after Supabase updates.
- **Validation errors** – Error toasts explain what failed; adjust inputs and resubmit.
- **Performance** – Keep tabs on large imports; break them into smaller files if necessary.
- **Data safety** – Regularly export your ledger from **Imports → Export** to maintain backups.

## Keyboard Shortcuts (Desktop)

- `Ctrl/Cmd + K` – Focus global search (if enabled in header).
- `Esc` – Close open dialogs or sheets.
- `Tab/Shift+Tab` – Navigate form fields without leaving the keyboard.

## Staying Organized

- Use tags consistently (e.g., `vacation`, `medical`) to create meaningful report filters.
- Review budgets monthly to keep targets aligned with actual spend.
- Archive old accounts instead of deleting to maintain historical data integrity.

## Need More Help?

Check the project README for environment setup, or consult the Supabase dashboard for authentication and database configuration details. Happy budgeting!
