# Velora Commerce Studio

A production-oriented full-stack commerce platform built to explore the systems behind a modern storefront — not just the storefront itself.

Velora combines a polished customer shopping experience with a real commerce management workspace covering products, inventory, coupons, orders, storefront content, authentication, payments, and realtime updates.

## Features

- Dynamic storefront with search, categories, product pages, cart, and checkout
- CMS for products, coupons, inventory, and storefront content
- Inventory validation and checkout-time reservations
- Stripe hosted checkout with payment/session verification and idempotency handling
- Customer authentication and order history
- Realtime catalog, order, and commerce updates
- Coupon rules with expiry, usage limits, minimum subtotals, and per-customer limits
- Responsive mobile-first UI with animated interactions
- Server-side commerce and checkout logic
- Test coverage definitions for core commerce workflows

## Architecture

**Frontend:** React, TypeScript, Vite, Tailwind CSS

**Backend:** AppDeploy runtime, persistent database, authentication, realtime subscriptions, Stripe

**Commerce flow:**

`Catalog → Cart → Coupon → Inventory reservation → Stripe Checkout → Payment verification → Order fulfillment`

The backend owns critical state transitions while the frontend handles presentation and interaction.

## Core data

- Products
- Store settings
- Coupons
- Orders
- Inventory reservations
- Customer accounts

## Why I built it

Velora started as an e-commerce UI project and evolved into an exercise in the less-visible parts of commerce engineering: state consistency, inventory, payments, authentication, CMS workflows, realtime synchronization, and failure handling.

The goal is to make the application feel like a real product rather than a static portfolio mockup.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Environment

Stripe checkout requires a server-side `STRIPE_SECRET_KEY` configured through the deployment platform's secret management.

Never expose the Stripe secret key in frontend code.

## Project status

Actively developed portfolio project focused on full-stack commerce architecture, product engineering, and production-oriented application behavior.

Built by [@mrphatom](https://github.com/mrphatom).
