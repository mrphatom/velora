# Velora Commerce Studio

A production-oriented full-stack commerce platform built to showcase the engineering behind a real online store — not a static e-commerce mockup.

Velora combines a customer storefront with a persistent commerce backend, CMS, inventory system, Stripe payments, customer accounts, realtime synchronization, order lifecycle management, refunds, audit logging, and responsive operations tooling.

## Product surface

- Dynamic storefront with catalog, categories, search, product detail, cart, and checkout
- Persistent CMS for products, coupons, inventory, and live storefront content
- Customer authentication and private order history
- Stripe-hosted payments with server-side pricing and idempotent checkout creation
- Inventory reservations during checkout
- Payment finalization plus signed Stripe webhook processing
- Customer order cancellation for unpaid orders
- Customer self-service refund flow with Stripe refund creation and inventory restoration
- Inventory movement ledger
- Commerce audit log
- Realtime catalog and order synchronization
- Coupon rules with expiry, usage limits, minimum subtotals, and per-customer limits
- Responsive Commerce Studio designed for desktop and mobile
- Failure handling for stale carts, unavailable inventory, invalid coupons, duplicate checkout attempts, failed payment flows, and API errors

## Architecture

**Frontend**

- React 19
- TypeScript
- Vite
- Tailwind CSS
- AppDeploy client API
- WebSocket realtime synchronization

**Backend**

- AppDeploy server runtime
- Persistent database
- Authenticated API routes
- Stripe API integration
- Signed webhook verification
- Inventory reservation and movement records
- Order lifecycle state transitions
- Audit records
- Idempotency handling

### Core commerce flow

`Catalog → Cart → Server quote → Inventory reservation → Stripe Checkout → Payment verification → Order paid → Fulfillment / Refund`

Critical totals, inventory decisions, payment state, and order ownership are handled server-side.

## Data model

The application uses persistent records for:

- Products
- Store settings
- Coupons
- Orders
- Inventory reservations
- Inventory movements
- Audit logs
- Realtime subscriptions

## Security-oriented behavior

- Customer order endpoints verify ownership before exposing order data.
- Manual order creation is disabled.
- Unpaid orders can only be cancelled by their owner.
- Paid orders use Stripe for refunds instead of simply changing a local status.
- Stripe webhook requests require a configured signing secret.
- Inventory changes are recorded as movements during payment and refund flows.
- Stripe secrets remain backend-only.

## Stripe configuration

The backend expects:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

The webhook endpoint is:

`POST /api/stripe/webhook`

Configure Stripe to send successful Checkout events to the deployed endpoint. Stripe webhook endpoints use a signing secret to authenticate events. urlStripe webhook endpoint documentationhttps://docs.stripe.com/api/webhook_endpoints

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Testing

The repository includes an end-to-end test contract covering:

1. Persistent storefront/cart behavior
2. Real CMS product CRUD and inventory
3. Coupon CRUD and enforcement
4. Mobile storefront-content management
5. Authenticated checkout, payment, order lifecycle, refunds, inventory restoration, and audit behavior

## Project status

Velora is an actively developed portfolio project focused on full-stack product engineering and production-oriented commerce architecture.

The goal is not to demonstrate a collection of UI screens. The goal is to demonstrate the systems required to make those screens trustworthy.

Built by [@mrphatom](https://github.com/mrphatom).
