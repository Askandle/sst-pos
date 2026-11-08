# NetPOS - Internet Cafe Point of Sale & Management System

A modern, full-featured Point of Sale (POS) and management web application tailored for internet cafes, gaming centers, and business document services. Built with React 19, TypeScript, Tailwind CSS v4, and Vite.

---

## Key Features

- **Dashboard**:
  - Real-time financial metrics for **Today's Sales**, **Completed Transactions**, and **Daily Expenses** in Ghanaian Cedis (`GH₵`).
  - Automated **Low Stock Alert** counter and warnings for items needing replenishment.
  - One-click **Quick Actions** to start a transaction, log an expense, or view history.

- **Services**:
  - Catalog of internet cafe services: Standard PC rentals (per hour), VIP Gaming Rig time, Black & White laser printing (per page), Color laser printing, Document scanning, and Thermal lamination.
  - Add to cart with dynamic quantity counters and live subtotal calculations.
  - Administrator controls to create, update, or remove service offerings.

- **Products & Inventory**:
  - Categorized retail goods (computer peripherals, flash drives, Ethernet cables, drinks/snacks, stationery).
  - Stock tracking with low-stock badges.
  - Image upload with automatic client-side canvas compression.
  - Administrator controls to add new items, update stock, and edit prices.

- **Checkout & POS**:
  - Shopping cart with product stock-limit validation.
  - Multiple payment methods: **Cash**, **Card**, and **Mobile Payment**.
  - Optional customer/order notes.
  - Automatic inventory deduction upon completing a transaction.

- **Transactions History**:
  - Filterable audit log of completed transactions with date/time, staff attribution, and payment method badges.
  - Detailed modal view displaying itemized line items, unit prices, quantities, and receipt totals.

- **Daily Operating Expenses**:
  - Track store expenses categorized under **Supplies**, **Utilities**, **Maintenance**, or **Other**.
  - Detailed description, amount in Cedis (`GH₵`), expense date, and receipt invoice notes.
  - Cumulative daily spend calculator and admin deletion controls.

- **Admin Panel & RBAC**:
  - Role-Based Access Control distinguishing **Admins** and **Staff**.
  - User management table enabling role upgrades and downgrades.
  - System diagnostics and connection status.

- **Authentication & Security**:
  - Tabbed Login and Registration forms with username validation.
  - Protected routes with redirect preservation (`from` route memory).
  - Automatic admin assignment for the initial user.

- **Theme & Ergonomics**:
  - Full support for both **Light** and **Dark** modes.
  - High-visibility colored border accents on cards, buttons, and interactive shapes.
  - Responsive layout for desktop counters, tablets, and mobile devices.

---

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 8
- **Styling**: Tailwind CSS v4 with custom semantic color tokens
- **Routing**: React Router v7
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Date Formatting**: Date-fns

---

## Default Accounts

The system comes pre-seeded with local demo accounts:

| Username | Role | Default Password |
| :--- | :--- | :--- |
| `admin` | Administrator | `admin123` (or any valid password) |
| `sarah_pos` | Staff | `password123` |
| `alex_desk` | Staff | `password123` |

*Note: New accounts created via the Sign Up tab default to `Staff` (or `Admin` if no users exist).*

---

## Project Structure

```text
├── public/                 # Static assets and icons
├── src/
│   ├── components/
│   │   ├── common/         # Page metadata and shared helpers
│   │   ├── layout/         # Top navbar and responsive shell
│   │   └── ui/             # Reusable UI primitives (Card, Button, Dialog, Select, Table, etc.)
│   ├── contexts/           # Authentication state context (AuthContext)
│   ├── db/                 # Local persistence layer and mock dataset (api.ts)
│   ├── lib/                # Image compression and upload helper utilities
│   ├── pages/              # Application pages
│   │   ├── AdminPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ExpensesPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotFound.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── ServicesPage.tsx
│   │   └── TransactionsPage.tsx
│   ├── types/              # TypeScript interfaces and shared types
│   ├── App.tsx             # Route definitions and session providers
│   ├── index.css           # Tailwind v4 theme variables and global styles
│   └── main.tsx            # DOM root entry point
├── metadata.json           # Application metadata
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration and path aliases
```

---

## Getting Started

### Installation

```bash
npm install
```

### Development Server

Run the development server on `http://localhost:3000`:

```bash
npm run dev
```

### Production Build

Create an optimized production bundle:

```bash
npm run build
```

### Code Quality Check

Run the TypeScript type checker:

```bash
npm run lint
```

---

## License

Apache-2.0
