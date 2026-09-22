import { createHmac, timingSafeEqual } from 'node:crypto';
import { error, json, requireAuth, secrets, db } from '@appdeploy/sdk';

type Order = { userId?: string; email: string; items: Array<Record<string, unknown>>; subtotal: number; discount: number; total: number; status: string; createdAt: string; stripeSessionId?: string; paidAt?: string; refundedAt?: string; refundId?: string; idempotencyKey?: string; checkoutUrl?: string; couponCode?: string };
type Product = { name: string; price: number; stock: number; category: string; image: string };
type Reservation = { orderId: string; userId: string; productId: string; quantity: number; status: 'active' | 'consumed' | 'released'; expiresAt: string };
type StripeSession = { id?: string; payment_status?: string; payment_intent?: string | { id?: string } | null; metadata?: Record<string, string> };

const list = async <T>(table: string, limit = 200) => (await db.list<T>(table, { limit })).items;
const isFuture = (value: string) => new Date(value).getTime() > Date.now();

function verifyStripeSignature(payload: string, signature: string, secret: string) {
  const parts = signature.split(',');
  const timestamp = parts.find(part => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;
  const expected = createHmac('sha256', secret).update(timestamp + '.' + payload).digest('hex');
  return signatures.some(value => {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(value, 'utf8');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  });
}

async function stripeRequest(method: 'GET' | 'POST', path: string, params?: URLSearchParams) {
  const key = await secrets.readSecret('STRIPE_SECRET_KEY');
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + key, ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(params ? { body: params.toString() } : {}),
  });
  const data = await response.json() as { id?: string; payment_status?: string; payment_intent?: string | { id?: string } | null; metadata?: Record<string, string>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || 'Stripe request failed');
  return data;
}

async function audit(action: string, actorId: string | undefined, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await db.add('audit_logs', [{ action, actorId: actorId || 'system', entityType, entityId, metadata, createdAt: new Date().toISOString() }]);
}

async function releaseReservations(orderId: string) {
  const reservations = await list<Reservation>('inventory_reservations');
  for (const reservation of reservations.filter(x => x.orderId === orderId && x.status === 'active')) {
    const [current] = await db.get<Reservation>('inventory_reservations', [reservation.id]);
    if (current?.status === 'active') await db.update('inventory_reservations', [{ id: reservation.id, record: { ...current, status: 'released' } }]);
  }
}

async function restockOrder(order: Order, orderId: string) {
  const products = await db.get<Product>('products', order.items.map(item => String(item.id)));
  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index] as { id: string; quantity: number };
    const product = products[index];
    if (!product) throw new Error('Product missing while restoring inventory');
    const next = { ...product, stock: product.stock + item.quantity };
    const [ok] = await db.update('products', [{ id: item.id, record: next }]);
    if (!ok) throw new Error('Could not restore inventory');
    await db.add('inventory_movements', [{ productId: item.id, quantity: item.quantity, direction: 'in', reason: 'customer_refund', orderId, createdAt: new Date().toISOString() }]);
  }
}

async function fulfillPaidSession(session: StripeSession) {
  const orderId = session.metadata?.orderId;
  if (!orderId) throw new Error('Stripe session is missing the Velora order reference');
  const [order] = await db.get<Order>('orders', [orderId]);
  if (!order) throw new Error('Velora order not found');
  if (['Paid', 'Fulfilled', 'Refunded'].includes(order.status)) return { ...order, id: orderId };
  if (session.payment_status !== 'paid') throw new Error('Payment has not completed');

  const reservations = (await list<Reservation>('inventory_reservations')).filter(x => x.orderId === orderId && x.status === 'active');
  if (!reservations.length || reservations.some(x => !isFuture(x.expiresAt))) throw new Error('Inventory reservation expired');

  const products = await db.get<Product>('products', order.items.map(item => String(item.id)));
  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index] as { id: string; quantity: number };
    if (!products[index] || products[index]!.stock < item.quantity) throw new Error('Inventory changed before payment confirmation');
  }

  for (let index = 0; index < order.items.length; index += 1) {
    const item = order.items[index] as { id: string; quantity: number };
    const product = products[index]!;
    const next = { ...product, stock: product.stock - item.quantity };
    const [ok] = await db.update('products', [{ id: item.id, record: next }]);
    if (!ok) throw new Error('Inventory fulfillment failed');
    await db.add('inventory_movements', [{ productId: item.id, quantity: item.quantity, direction: 'out', reason: 'order_paid', orderId, createdAt: new Date().toISOString() }]);
  }

  for (const reservation of reservations) {
    await db.update('inventory_reservations', [{ id: reservation.id, record: { ...reservation, status: 'consumed' } }]);
  }

  const paid = { ...order, status: 'Paid', paidAt: order.paidAt || new Date().toISOString(), stripeSessionId: session.id || order.stripeSessionId };
  await db.update('orders', [{ id: orderId, record: paid }]);
  await audit('order.paid', session.metadata?.userId, 'order', orderId, { stripeSessionId: session.id });
  return { ...paid, id: orderId };
}

export const enterpriseRoutes = {
  'GET /api/system/status': [requireAuth(), async () => {
    const names = await secrets.listSecretNames();
    const [products, orders] = await Promise.all([db.list('products', { limit: 1 }), db.list('orders', { limit: 1 })]);
    return json({ service: 'velora-commerce', version: 'enterprise-foundation-v1', database: true, stripeConfigured: names.includes('STRIPE_SECRET_KEY'), webhookConfigured: names.includes('STRIPE_WEBHOOK_SECRET'), catalogReady: products.items.length > 0, ordersReady: orders.items.length > 0, checkedAt: new Date().toISOString() });
  }],

  'GET /api/orders/:id': [requireAuth(), async ({ params, user }) => {
    const [order] = await db.get<Order>('orders', [params.id]);
    if (!order) return error('Order not found', 404);
    if (order.userId !== user!.userId) return error('You do not have access to this order', 403);
    return json({ order: { ...order, id: params.id } });
  }],

  'POST /api/orders/:id/cancel': [requireAuth(), async ({ params, user }) => {
    const [order] = await db.get<Order>('orders', [params.id]);
    if (!order) return error('Order not found', 404);
    if (order.userId !== user!.userId) return error('You do not have access to this order', 403);
    if (order.status !== 'Awaiting payment') return error('Only unpaid orders can be cancelled', 409);
    if (order.stripeSessionId) {
      try { await stripeRequest('POST', 'checkout/sessions/' + encodeURIComponent(order.stripeSessionId) + '/expire'); } catch {}
    }
    await releaseReservations(params.id);
    const cancelled = { ...order, status: 'Cancelled', cancelledAt: new Date().toISOString() };
    const [ok] = await db.update('orders', [{ id: params.id, record: cancelled }]);
    if (!ok) return error('Could not cancel order', 500);
    await audit('order.cancelled', user!.userId, 'order', params.id);
    return json({ order: { ...cancelled, id: params.id } });
  }],

  'POST /api/orders/:id/refund': [requireAuth(), async ({ params, user }) => {
    const [order] = await db.get<Order>('orders', [params.id]);
    if (!order) return error('Order not found', 404);
    if (order.userId !== user!.userId) return error('You do not have access to this order', 403);
    if (!['Paid', 'Fulfilled'].includes(order.status)) return error('Only paid orders can be refunded', 409);
    if (order.refundId) return json({ order: { ...order, id: params.id }, refund: { id: order.refundId, status: 'already_refunded' } });
    if (!order.stripeSessionId) return error('Payment reference is missing', 409);

    const session = await stripeRequest('GET', 'checkout/sessions/' + encodeURIComponent(order.stripeSessionId));
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!paymentIntent) return error('Stripe payment reference is missing', 409);

    const form = new URLSearchParams();
    form.set('payment_intent', paymentIntent);
    form.set('reason', 'requested_by_customer');
    form.set('metadata[order_id]', params.id);
    const refund = await stripeRequest('POST', 'refunds', form);

    await restockOrder(order, params.id);
    const refunded = { ...order, status: 'Refunded', refundedAt: new Date().toISOString(), refundId: refund.id };
    await db.update('orders', [{ id: params.id, record: refunded }]);
    await audit('order.refunded', user!.userId, 'order', params.id, { refundId: refund.id });
    return json({ order: { ...refunded, id: params.id }, refund: { id: refund.id, status: 'succeeded' } });
  }],

  'GET /api/inventory/movements': [requireAuth(), async () => {
    const items = await list<Record<string, unknown>>('inventory_movements', 200);
    return json({ items: items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  }],

  'GET /api/audit-log': [requireAuth(), async () => {
    const items = await list<Record<string, unknown>>('audit_logs', 200);
    return json({ items: items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) });
  }],

  'POST /api/stripe/webhook': [async (ctx) => {
    const event = ctx.event as { body?: string; headers?: Record<string, string | string[]>; isBase64Encoded?: boolean };
    const signatureHeader = event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    let secret: string;
    try {
      secret = await secrets.readSecret('STRIPE_WEBHOOK_SECRET');
    } catch {
      return error('Stripe webhook secret is not configured', 503);
    }
    const rawBody = typeof event.body === 'string'
      ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body)
      : JSON.stringify(ctx.body);
    if (!signature || !verifyStripeSignature(rawBody, signature, secret)) {
      return error('Invalid Stripe webhook signature', 400);
    }
    let webhookEvent: { type?: string; id?: string; data?: { object?: StripeSession } };
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch {
      return error('Invalid Stripe event body', 400);
    }
    if (!webhookEvent.type) return error('Invalid Stripe event', 400);
    if (webhookEvent.type === 'checkout.session.completed' || webhookEvent.type === 'checkout.session.async_payment_succeeded') {
      try {
        await fulfillPaidSession(webhookEvent.data?.object || {});
      } catch (cause) {
        return error(cause instanceof Error ? cause.message : 'Webhook fulfillment failed', 500);
      }
    }
    if (webhookEvent.id) {
      await audit('stripe.webhook.received', undefined, 'stripe_event', webhookEvent.id, { type: webhookEvent.type });
    }
    return json({ received: true });
  }],
};
