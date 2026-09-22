import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ws } from '@appdeploy/client';
import { auth } from '@appdeploy/client';
import {
  BarChart3,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Edit3,
  Grid2X2,
  Heart,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sun,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAt?: number;
  category: string;
  description: string;
  image: string;
  stock: number;
  featured: boolean;
  rating: number;
  reviews: number;
  tags: string[];
};
type Coupon = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  active: boolean;
  expiresAt: string;
  usageLimit?: number;
  usedCount?: number;
  perUserLimit?: number;
};
type StoreSettings = {
  storeName: string;
  announcement: string;
  heroTitle: string;
  heroAccent: string;
  heroBody: string;
  footerText: string;
  deliveryThreshold: number;
  deliveryFee: number;
};
type CartItem = Product & { quantity: number };
type Order = {
  id: string;
  email: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  createdAt: string;
};

const seedProducts: Product[] = [
  {
    id: 'p1',
    name: 'Aero Knit Runner',
    slug: 'aero-knit-runner',
    price: 89000,
    compareAt: 109000,
    category: 'Footwear',
    description:
      'Breathable knit runners engineered for all-day movement, with a sculpted sole and featherweight feel.',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
    stock: 24,
    featured: true,
    rating: 4.9,
    reviews: 128,
    tags: ['new', 'best-seller'],
  },
  {
    id: 'p2',
    name: 'Serein Overshirt',
    slug: 'serein-overshirt',
    price: 64000,
    category: 'Apparel',
    description:
      'A structured everyday overshirt cut from a soft technical cotton blend.',
    image:
      'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=85',
    stock: 18,
    featured: true,
    rating: 4.8,
    reviews: 84,
    tags: ['editor-pick'],
  },
  {
    id: 'p3',
    name: 'Mono Carry Tote',
    slug: 'mono-carry-tote',
    price: 52000,
    category: 'Bags',
    description:
      'Minimal carryall with reinforced handles, internal laptop sleeve and water-resistant finish.',
    image:
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85',
    stock: 31,
    featured: false,
    rating: 4.7,
    reviews: 62,
    tags: ['utility'],
  },
  {
    id: 'p4',
    name: 'Halo Chrono',
    slug: 'halo-chrono',
    price: 185000,
    compareAt: 220000,
    category: 'Accessories',
    description:
      'A clean chronograph with a brushed steel case and interchangeable strap system.',
    image:
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85',
    stock: 9,
    featured: true,
    rating: 4.9,
    reviews: 41,
    tags: ['limited'],
  },
  {
    id: 'p5',
    name: 'Form Desk Lamp',
    slug: 'form-desk-lamp',
    price: 76000,
    category: 'Home',
    description:
      'Ambient task lighting with a tactile dimmer and architectural silhouette.',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85',
    stock: 15,
    featured: false,
    rating: 4.6,
    reviews: 37,
    tags: ['home'],
  },
  {
    id: 'p6',
    name: 'Studio Headphones',
    slug: 'studio-headphones',
    price: 128000,
    category: 'Tech',
    description:
      'Closed-back wireless headphones tuned for focused listening and long sessions.',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85',
    stock: 12,
    featured: true,
    rating: 4.8,
    reviews: 93,
    tags: ['audio'],
  },
];

const money = (n: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
const defaultSettings: StoreSettings = {
  storeName: 'VELORA',
  announcement: 'Free delivery on orders over ₦150,000 · Use VELORA10 for 10% off',
  heroTitle: 'Objects with',
  heroAccent: 'presence.',
  heroBody: 'A considered edit of modern essentials for people who care about what they bring into the world.',
  footerText: 'Considered goods for modern living.',
  deliveryThreshold: 150000,
  deliveryFee: 4500,
};

function App() {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [page, setPage] = useState<
    'home' | 'shop' | 'product' | 'checkout' | 'admin' | 'account'
  >('home');
  const [productId, setProductId] = useState('p1');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [adminTab, setAdminTab] = useState<
    'overview' | 'products' | 'coupons' | 'orders' | 'content'
  >('overview');
  const [productDraft, setProductDraft] = useState<Omit<Product, 'id'>>({ name: '', slug: '', price: 0, category: '', description: '', image: '', stock: 0, featured: false, rating: 0, reviews: 0, tags: [] });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [couponDraft, setCouponDraft] = useState<Omit<Coupon, 'id' | 'usedCount'>>({ code: '', type: 'percent', value: 0, minSubtotal: 0, active: true, expiresAt: '', usageLimit: undefined, perUserLimit: undefined });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [adminSearch, setAdminSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [liveState, setLiveState] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const connectionRef = useRef<ReturnType<typeof ws.connect> | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('velora-cart-v2');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('velora-cart-v2', JSON.stringify(cart)); } catch {}
  }, [cart]);

  useEffect(() => {
    const connection = ws.connect({ heartbeatIntervalMs: 25000 });
    connectionRef.current = connection;
    connection.onOpen(() => setLiveState('live'));
    connection.onClose(() => setLiveState('offline'));
    connection.onError(() => setLiveState('offline'));
    connection.onMessage(message => {
      if (message?.type !== 'entity.update') return;
      const entity = message.payload?.entity_type;
      const data = message.payload?.data;
      if (entity === 'catalog' && data?.product) {
        setProducts(current => current.map(p => p.id === data.product.id ? { ...p, ...data.product } : p));
        setCart(current => current.map(item => item.id === data.product.id ? { ...item, ...data.product, quantity: Math.min(item.quantity, Math.max(0, data.product.stock)) } : item).filter(item => item.quantity > 0));
      }
      if (entity === 'orders' && data?.order) {
        setCustomerOrders(current => [data.order, ...current.filter(order => order.id !== data.order.id)]);
        setOrders(current => [data.order, ...current.filter(order => order.id !== data.order.id)]);
      }
    });
    return () => { connection.disconnect(); connectionRef.current = null; };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get('/api/products');
        if (p.data?.items?.length) setProducts(p.data.items);
        const c = await api.get('/api/coupons');
        if (c.data?.items) setCoupons(c.data.items);
        const s = await api.get('/api/settings');
        if (s.data?.settings) setSettings({ ...defaultSettings, ...s.data.settings });
        const o = await api.get('/api/orders');
        if (o.data?.items) setOrders(o.data.items);
        const current = await auth.getUser();
        setUser(current);
        if (current) {
          const mine = await api.get('/api/my-orders');
          if (mine.data?.items) setCustomerOrders(mine.data.items);
        }
      } catch {} finally {
        setAuthLoading(false);
      }
    })();
  }, []);
  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;
    connection.ready.then(async () => {
      if (!connection.connectionId) return;
      try {
        await api.post('/api/subscriptions', { entity_type: 'catalog', entity_id: 'products', connection_id: connection.connectionId });
        if (user) await api.post('/api/subscriptions', { entity_type: 'orders', entity_id: user.userId, connection_id: connection.connectionId });
      } catch {}
    });
  }, [user]);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId || !user) return;
    (async () => {
      try {
        const r = await api.post('/api/stripe/finalize-session', { sessionId });
        if (r.data?.order) {
          setCustomerOrders(o => [r.data.order, ...o.filter(x => x.id !== r.data.order.id)]);
          setOrders(o => [r.data.order, ...o.filter(x => x.id !== r.data.order.id)]);
          setCart([]);
          setAppliedCoupon(null);
          window.history.replaceState({}, '', window.location.pathname);
          alert('Payment confirmed — your order is on its way.');
        }
      } catch {}
    })();
  }, [user]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const filtered = useMemo(
    () =>
      products.filter(
        p =>
          (category === 'All' || p.category === category) &&
          p.name.toLowerCase().includes(query.toLowerCase())
      ),
    [products, category, query]
  );
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? (subtotal * appliedCoupon.value) / 100
      : appliedCoupon.value
    : 0;
  const delivery = subtotal >= settings.deliveryThreshold ? 0 : (cart.length ? settings.deliveryFee : 0);
  const total = Math.max(0, subtotal - discount + delivery);
  const selected = products.find(p => p.id === productId) || products[0];

  const addToCart = (p: Product) => {
    if (p.stock < 1) return;
    setCart(c => {
      const found = c.find(i => i.id === p.id);
      if (found) return c.map(i => i.id === p.id ? { ...i, ...p, quantity: Math.min(p.stock, found.quantity + 1) } : i);
      return [...c, { ...p, quantity: 1 }];
    });
    setCartOpen(true);
  };
  const updateQty = (id: string, d: number) =>
    setCart(c => c.map(i => i.id === id ? { ...i, quantity: Math.max(1, Math.min(i.stock, i.quantity + d)) } : i));
  const remove = (id: string) => setCart(c => c.filter(i => i.id !== id));
  const openProduct = (id: string) => {
    setProductId(id);
    setPage('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyCoupon = () => {
    const c = coupons.find(
      x => x.code.toLowerCase() === couponCode.trim().toLowerCase() && x.active && new Date(x.expiresAt).getTime() > Date.now() && (!x.usageLimit || (x.usedCount || 0) < x.usageLimit)
    );
    if (!c) {
      setCouponMsg('Coupon not found or inactive.');
      return;
    }
    if (subtotal < c.minSubtotal) {
      setCouponMsg('Add more items to unlock this coupon.');
      return;
    }
    setAppliedCoupon(c);
    setCouponMsg('Coupon applied — your discount is live.');
  };
  const signIn = async () => {
    try {
      const r = await auth.signIn();
      setUser(r.user);
      const mine = await api.get('/api/my-orders');
      if (mine.data?.items) setCustomerOrders(mine.data.items);
    } catch {}
  };
  const checkout = async () => {
    if (!cart.length || checkoutBusy) return;
    setCheckoutBusy(true);
    try {
      if (!user) {
        const r = await auth.signIn();
        setUser(r.user);
      }
      if (cart.some(i => i.quantity > i.stock || i.stock < 1)) throw new Error('One of the items in your bag is no longer available.');
      const key = checkoutKeyRef.current || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      checkoutKeyRef.current = key;
      const r = await api.post('/api/stripe/create-checkout-session', {
        items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
        couponCode: appliedCoupon?.code,
        idempotencyKey: key,
        successUrl: window.location.origin + window.location.pathname,
        cancelUrl: window.location.href,
      });
      if (r.data?.checkoutUrl) {
        window.location.assign(r.data.checkoutUrl);
      } else {
        throw new Error('Stripe checkout URL missing');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Unable to start secure checkout.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!productDraft.name.trim() || !productDraft.category.trim() || !productDraft.description.trim() || !productDraft.image.trim() || productDraft.price <= 0 || productDraft.stock < 0) {
      setNotice('Complete the product name, category, price, description, image and stock.');
      return;
    }
    try {
      const payload = { ...productDraft, slug: (productDraft.slug || productDraft.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') };
      const r = editingProductId ? await api.put('/api/products/' + editingProductId, payload) : await api.post('/api/products', payload);
      const product = r.data?.product;
      if (!product) throw new Error('Product was not saved.');
      setProducts(x => editingProductId ? x.map(p => p.id === product.id ? product : p) : [...x, product]);
      setNotice(editingProductId ? 'Product updated.' : 'Product created.');
      setEditingProductId(null);
      setProductDraft({ name: '', slug: '', price: 0, category: '', description: '', image: '', stock: 0, featured: false, rating: 0, reviews: 0, tags: [] });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not save product.'); }
  };
  const deleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try { await api.delete('/api/products/' + id); setProducts(x => x.filter(p => p.id !== id)); setCart(x => x.filter(i => i.id !== id)); setNotice('Product deleted.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not delete product.'); }
  };
  const saveCoupon = async () => {
    if (!couponDraft.code.trim() || couponDraft.value <= 0 || !couponDraft.expiresAt) { setNotice('Enter a coupon code, value and expiry.'); return; }
    try {
      const r = editingCouponId ? await api.put('/api/coupons/' + editingCouponId, couponDraft) : await api.post('/api/coupons', couponDraft);
      const coupon = r.data?.coupon;
      if (!coupon) throw new Error('Coupon was not saved.');
      setCoupons(x => editingCouponId ? x.map(c => c.id === coupon.id ? coupon : c) : [...x, coupon]);
      setNotice(editingCouponId ? 'Coupon updated.' : 'Coupon created.');
      setEditingCouponId(null);
      setCouponDraft({ code: '', type: 'percent', value: 0, minSubtotal: 0, active: true, expiresAt: '', usageLimit: undefined, perUserLimit: undefined });
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not save coupon.'); }
  };
  const deleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon?')) return;
    try { await api.delete('/api/coupons/' + id); setCoupons(x => x.filter(c => c.id !== id)); setNotice('Coupon deleted.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not delete coupon.'); }
  };
  const saveSettings = async () => {
    try { const r = await api.put('/api/settings', settings); if (r.data?.settings) setSettings(r.data.settings); setNotice('Storefront content published.'); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Could not publish content.'); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
      {notice && <div className="cmsToast"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15} /></button></div>}
      <div className="announcement">{settings.announcement}</div>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--glass)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <button className="brand" onClick={() => setPage('home')}>
            VELORA<span>.</span>
          </button>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            <button onClick={() => setPage('home')}>Home</button>
            <button
              onClick={() => {
                setPage('shop');
                setCategory('All');
              }}
            >
              Shop
            </button>
            <button
              onClick={() => {
                setPage('shop');
                setCategory('Apparel');
              }}
            >
              Collections
            </button>
            <button onClick={() => setPage('admin')}>Studio</button>
          </nav>
          <div className="flex items-center gap-1">
            <button
              className="iconBtn"
              onClick={() => setDark(!dark)}
              aria-label="Theme"
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="iconBtn hidden sm:flex"
              onClick={() => (user ? setPage('account') : signIn())}
              aria-label="Account"
              title={user ? 'My account' : 'Sign in'}
            >
              <CircleUserRound size={20} />
            </button>
            <button
              className="iconBtn relative"
              onClick={() => setCartOpen(true)}
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="badge">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
            <button
              className="iconBtn md:hidden"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
        {mobileNav && (
          <div className="mobileMenu md:hidden">
            <div className="mobileMenuScrim" onClick={() => setMobileNav(false)} />
            <div className="mobileMenuPanel">
              <div className="mobileMenuHead">
                <div><span className="eyebrow">Navigation</span><strong>Explore Velora</strong></div>
                <button className="iconBtn" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={20} /></button>
              </div>
              <div className="mobileMenuLinks">
                <button className="mobileMenuLink featured" onClick={() => { setPage('home'); setMobileNav(false); }}><span className="mobileMenuIcon"><Grid2X2 size={18} /></span><span><b>Home</b><small>The latest edit</small></span><ChevronRight size={16} /></button>
                <button className="mobileMenuLink" onClick={() => { setPage('shop'); setCategory('All'); setMobileNav(false); }}><span className="mobileMenuIcon"><ShoppingBag size={18} /></span><span><b>Shop</b><small>Browse the collection</small></span><ChevronRight size={16} /></button>
                <button className="mobileMenuLink" onClick={() => { setPage('shop'); setCategory('Apparel'); setMobileNav(false); }}><span className="mobileMenuIcon"><Sparkles size={18} /></span><span><b>Collections</b><small>Curated categories</small></span><ChevronRight size={16} /></button>
                <button className="mobileMenuLink studioLink" onClick={() => { setPage('admin'); setMobileNav(false); }}><span className="mobileMenuIcon"><LayoutDashboard size={18} /></span><span><b>Commerce Studio</b><small>Manage your store</small></span><ChevronRight size={16} /></button>
              </div>
              <div className="mobileMenuFooter">
                <button className="mobileMenuUtility" onClick={() => { if (user) setPage('account'); else signIn(); setMobileNav(false); }}><CircleUserRound size={17} /><span>{user ? 'My account' : 'Sign in'}</span></button>
                <button className="mobileMenuUtility" onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>{dark ? 'Light mode' : 'Dark mode'}</span></button>
              </div>
              <div className="mobileMenuNote"><span className="liveDot" /><span>Velora is live</span><span>·</span><span>2026 collection</span></div>
            </div>
          </div>
        )}
      </header>

      {page === 'home' && (
        <main>
          <section className="hero max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16">
            <div className="heroCopy">
              <div className="eyebrow">
                <Sparkles size={15} /> New season / 2026
              </div>
              <h1>{settings.heroTitle}<br /><em>{settings.heroAccent}</em></h1>
              <p>{settings.heroBody}</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <button className="primary" onClick={() => setPage('shop')}>
                  Explore collection <ChevronRight size={17} />
                </button>
                <button className="secondary" onClick={() => openProduct('p1')}>
                  View featured
                </button>
              </div>
            </div>
            <div className="heroVisual">
              <img src={products[0]?.image} />
              <div className="floatingCard">
                <span>Featured</span>
                <b>Aero Knit Runner</b>
                <small>₦89,000</small>
              </div>
            </div>
          </section>
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
            <div className="sectionHead">
              <div>
                <span className="eyebrow">Curated for you</span>
                <h2>Shop the edit</h2>
              </div>
              <button className="textBtn" onClick={() => setPage('shop')}>
                View all <ChevronRight size={16} />
              </button>
            </div>
            <div className="productGrid">
              {products
                .filter(p => p.featured)
                .map(p => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onOpen={openProduct}
                    onAdd={addToCart}
                  />
                ))}
            </div>
          </section>
          <section className="editorial max-w-7xl mx-auto px-4 sm:px-6 pb-24">
            <div>
              <span className="eyebrow">The Velora standard</span>
              <h2>
                Less noise.
                <br />
                <em>More intent.</em>
              </h2>
            </div>
            <div className="editorialText">
              <p>
                Every piece earns its place through material, function and
                restraint. We partner with makers who obsess over the details
                you feel every day.
              </p>
              <button className="textBtn" onClick={() => setPage('shop')}>
                Our collection <ChevronRight size={16} />
              </button>
            </div>
          </section>
        </main>
      )}

      {page === 'shop' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="shopTop">
            <div>
              <span className="eyebrow">Catalog</span>
              <h1 className="pageTitle">Shop all</h1>
            </div>
            <div className="search">
              <Search size={18} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products"
              />
            </div>
          </div>
          <div className="chips">
            {categories.map(c => (
              <button
                className={category === c ? 'chip active' : 'chip'}
                onClick={() => setCategory(c)}
                key={c}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="productGrid mt-8">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                p={p}
                onOpen={openProduct}
                onAdd={addToCart}
              />
            ))}
          </div>
        </main>
      )}

      {page === 'product' && selected && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <button className="back" onClick={() => setPage('shop')}>
            <ChevronLeft size={16} /> Back to shop
          </button>
          <div className="productDetail">
            <div className="detailImage">
              <img src={selected.image} />
            </div>
            <div className="detailInfo">
              <span className="eyebrow">{selected.category}</span>
              <h1>{selected.name}</h1>
              <div className="rating">
                ★★★★★{' '}
                <span>
                  {selected.rating} · {selected.reviews} reviews
                </span>
              </div>
              <div className="detailPrice">
                {money(selected.price)}{' '}
                {selected.compareAt && <del>{money(selected.compareAt)}</del>}
              </div>
              <p>{selected.description}</p>
              <div className="stock">
                <span className="dot" /> {selected.stock} in stock · ships in
                1–2 days
              </div>
              <button
                className="primary wide"
                onClick={() => addToCart(selected)}
              >
                Add to bag <ShoppingBag size={17} />
              </button>
              <div className="perks">
                <div>
                  <Package size={19} />
                  <span>
                    <b>Fast delivery</b>Nationwide shipping
                  </span>
                </div>
                <div>
                  <CreditCard size={19} />
                  <span>
                    <b>Secure checkout</b>Protected payments
                  </span>
                </div>
                <div>
                  <Heart size={19} />
                  <span>
                    <b>Easy returns</b>7-day return window
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {page === 'account' && (
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <span className="eyebrow">Customer account</span>
              <h1 className="pageTitle">Your orders</h1>
              <p className="text-sm opacity-70 mt-2">{user?.email || 'Signed-in customer'}</p>
            </div>
            <button className="secondary" onClick={() => auth.signOut().then(() => { setUser(null); setCustomerOrders([]); setPage('home'); })}>Sign out</button>
          </div>
          <div className="grid gap-4">
            {customerOrders.length ? customerOrders.map(o => (
              <div className="panel p-5" key={o.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div><b>Order #{o.id.slice(-8)}</b><small className="block opacity-60 mt-1">{new Date(o.createdAt).toLocaleString()}</small></div>
                  <span className="statusOn">{o.status}</span>
                </div>
                <div className="grid gap-3">
                  {o.items.map((item, index) => {
                    const line = item as CartItem;
                    return <div className="flex items-center gap-3" key={line.id + '-' + index}><img className="w-12 h-12 rounded-lg object-cover" src={line.image} /><div className="flex-1"><b>{line.name}</b><small className="block opacity-60">Qty {line.quantity}</small></div><span>{money(line.price * line.quantity)}</span></div>;
                  })}
                </div>
                <div className="flex justify-between border-t border-[var(--line)] mt-4 pt-4"><span>Total</span><b>{money(o.total)}</b></div>
              </div>
            )) : <div className="empty"><ShoppingBag size={30} /><h3>No orders yet</h3><p>Your paid orders will appear here.</p><button className="primary mt-4" onClick={() => setPage('shop')}>Start shopping</button></div>}
          </div>
        </main>
      )}

      {page === 'checkout' && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <button className="back" onClick={() => setCartOpen(true)}>
            <ChevronLeft size={16} /> Back to bag
          </button>
          <div className="checkoutGrid">
            <section>
              <span className="eyebrow">Checkout</span>
              <h1 className="pageTitle">Complete your order</h1>
              <div className="formCard">
                <h3>Contact</h3>
                <input
                  defaultValue={user?.email || ''}
                  placeholder="Email address"
                />
                <h3>Delivery</h3>
                <div className="two">
                  <input placeholder="First name" />
                  <input placeholder="Last name" />
                </div>
                <input placeholder="Address" />
                <div className="two">
                  <input placeholder="City" />
                  <input placeholder="Phone" />
                </div>
                <h3>Payment</h3>
                <div className="payment">
                  <CreditCard size={20} />
                  <span>Card payment</span>
                  <small>Encrypted & secure</small>
                </div>
                  <button className="primary wide" onClick={checkout} disabled={authLoading || checkoutBusy}>
                  {authLoading ? 'Checking account…' : checkoutBusy ? 'Securing your checkout…' : `Pay ${money(total + (subtotal >= 150000 ? 0 : 4500))} with Stripe`} <CreditCard size={17} />
                </button>
                <small className="block text-center opacity-60 mt-3">You’ll be redirected to Stripe’s secure hosted checkout.</small>
              </div>
            </section>
            <aside className="summary">
              <h3>Your order</h3>
              {cart.map(i => (
                <div className="summaryItem" key={i.id}>
                  <img src={i.image} />
                  <div>
                    <b>{i.name}</b>
                    <small>Qty {i.quantity}</small>
                  </div>
                  <span>{money(i.price * i.quantity)}</span>
                </div>
              ))}
              <div className="coupon">
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                />
                <button onClick={applyCoupon}>Apply</button>
              </div>
              {couponMsg && <small className="couponMsg">{couponMsg}</small>}
              <div className="totals">
                <span>
                  Subtotal <b>{money(subtotal)}</b>
                </span>
                <span>
                  Discount <b>-{money(discount)}</b>
                </span>
                <span>
                  Delivery <b>{subtotal >= 150000 ? 'Free' : money(4500)}</b>
                </span>
                <strong>
                  Total <b>{money(total + (subtotal >= 150000 ? 0 : 4500))}</b>
                </strong>
              </div>
            </aside>
          </div>
        </main>
      )}

      {page === 'admin' && (
        <main className="adminWrap">
          <aside className="adminSide">
            <div className="adminLogo">
              <div className="adminLogoMark">V<span>.</span></div>
              <div><b>VELORA</b><span>.</span><small>Commerce Studio</small></div>
            </div>
            <div className="adminRailLabel">Workspace</div>
            {[
              ['overview', LayoutDashboard, 'Overview'],
              ['products', Package, 'Products'],
              ['coupons', Tag, 'Coupons'],
              ['orders', ShoppingBag, 'Orders'],
              ['content', Settings, 'Content'],
            ].map(([key, Icon, label]) => (
              <button className={adminTab === key ? 'adminNav active' : 'adminNav'} onClick={() => setAdminTab(key as any)} key={key as string}>
                <span className="adminNavIcon"><Icon size={17} /></span>
                <span className="adminNavLabel">{label as string}</span>
                <span className="adminNavArrow">{adminTab === key ? '•' : ''}</span>
              </button>
            ))}
            <div className="adminUser">
              {user?.email || 'Store manager'}
              <button onClick={signIn}>Sign in</button>
            </div>
          </aside>
          <section className="adminMain">
            <div className="adminTop">
              <div>
                <span className="eyebrow">Management</span>
                <h1>
                  {adminTab === 'overview'
                    ? 'Good afternoon.'
                    : adminTab[0].toUpperCase() + adminTab.slice(1)}
                </h1>
              </div>
              <div className="adminTopActions">
                <div className="adminLive"><span className="liveDot" /> Store live</div>
                <button className="adminStorefront" onClick={() => setPage('home')}><ShoppingBag size={16} /> Storefront</button>
                <button className="primary" onClick={() => {
                  if (adminTab === 'products') {
                    setEditingProductId(null);
                    setProductDraft({name:'',slug:'',price:0,category:'',description:'',image:'',stock:0,featured:false,rating:0,reviews:0,tags:[]});
                    setTimeout(() => document.getElementById('productEditor')?.scrollIntoView({behavior:'smooth',block:'start'}), 0);
                  } else if (adminTab === 'coupons') {
                    setEditingCouponId(null);
                    setCouponDraft({code:'',type:'percent',value:0,minSubtotal:0,active:true,expiresAt:'',usageLimit:undefined,perUserLimit:undefined});
                    setTimeout(() => document.getElementById('couponEditor')?.scrollIntoView({behavior:'smooth',block:'start'}), 0);
                  } else if (adminTab === 'content') {
                    document.querySelector('.cmsEditor')?.scrollIntoView({behavior:'smooth',block:'start'});
                  }
                }}><Plus size={17} /> Add new</button>
              </div>
            </div>
            {adminTab === 'overview' && (
              <>
                <div className="stats">
                  <Stat
                    icon={TrendingUp}
                    label="Revenue"
                    value={money(
                      orders.reduce((s, o) => s + o.total, 0) || 1842000
                    )}
                    trend="+18.4%"
                  />
                  <Stat
                    icon={ShoppingBag}
                    label="Orders"
                    value={String(orders.length || 126)}
                    trend="+12.2%"
                  />
                  <Stat
                    icon={Package}
                    label="Products"
                    value={String(products.length)}
                    trend="Live catalog"
                  />
                  <Stat
                    icon={Tag}
                    label="Coupons"
                    value={String(coupons.length)}
                    trend="Active tools"
                  />
                </div>
                <div className="dashboardGrid">
                  <div className="panel">
                    <div className="panelHead">
                      <h3>Sales overview</h3>
                      <span>Last 30 days</span>
                    </div>
                    <div className="bars">
                      {[38, 52, 45, 68, 56, 74, 61, 88, 72, 95, 82, 100].map(
                        (h, i) => (
                          <div key={i} className="barCol">
                            <div style={{ height: h + '%' }} />
                            <small>
                              {
                                [
                                  'M',
                                  'T',
                                  'W',
                                  'T',
                                  'F',
                                  'S',
                                  'S',
                                  'M',
                                  'T',
                                  'W',
                                  'T',
                                  'F',
                                ][i]
                              }
                            </small>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panelHead">
                      <h3>Recent orders</h3>
                      <button
                        className="textBtn"
                        onClick={() => setAdminTab('orders')}
                      >
                        View all
                      </button>
                    </div>
                    {orders.slice(0, 4).map(o => (
                      <div className="orderRow" key={o.id}>
                        <span>#{o.id.slice(-6)}</span>
                        <b>{o.email}</b>
                        <span>{money(o.total)}</span>
                        <i>{o.status}</i>
                      </div>
                    ))}
                    {!orders.length && (
                      <div className="empty">
                        No live orders yet. Your first order will appear here.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {adminTab === 'products' && (
              <div className="panel cmsPanel">
                <div className="panelHead"><div><h3>Catalog & inventory</h3><span>{products.length} real database records</span></div><div className="searchBox cmsSearch"><Search size={16}/><input value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} placeholder="Search catalog"/></div></div>
                <div id="productEditor" className="cmsEditor">
                  <div className="cmsEditorHead"><div><span className="eyebrow">{editingProductId ? 'Edit product' : 'New product'}</span><h3>{editingProductId ? 'Update an existing record' : 'Create a real product'}</h3></div>{editingProductId&&<button className="textBtn" onClick={()=>{setEditingProductId(null);setProductDraft({name:'',slug:'',price:0,category:'',description:'',image:'',stock:0,featured:false,rating:0,reviews:0,tags:[]})}}>Cancel</button>}</div>
                  <div className="cmsFormGrid">
                    <label><span>Name</span><input value={productDraft.name} onChange={e=>setProductDraft({...productDraft,name:e.target.value})} placeholder="Product name"/></label>
                    <label><span>Slug</span><input value={productDraft.slug} onChange={e=>setProductDraft({...productDraft,slug:e.target.value})} placeholder="product-slug"/></label>
                    <label><span>Price (NGN)</span><input type="number" min="1" value={productDraft.price||''} onChange={e=>setProductDraft({...productDraft,price:Number(e.target.value)})}/></label>
                    <label><span>Compare at (NGN)</span><input type="number" min="0" value={productDraft.compareAt||''} onChange={e=>setProductDraft({...productDraft,compareAt:Number(e.target.value)||undefined})}/></label>
                    <label><span>Category</span><input value={productDraft.category} onChange={e=>setProductDraft({...productDraft,category:e.target.value})} placeholder="Footwear"/></label>
                    <label><span>Stock</span><input type="number" min="0" value={productDraft.stock} onChange={e=>setProductDraft({...productDraft,stock:Math.max(0,Number(e.target.value))})}/></label>
                    <label className="full"><span>Image URL</span><input value={productDraft.image} onChange={e=>setProductDraft({...productDraft,image:e.target.value})} placeholder="https://…"/></label>
                    <label className="full"><span>Description</span><textarea value={productDraft.description} onChange={e=>setProductDraft({...productDraft,description:e.target.value})} placeholder="Describe the product…"/></label>
                    <label className="full"><span>Tags (comma separated)</span><input value={productDraft.tags.join(', ')} onChange={e=>setProductDraft({...productDraft,tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} placeholder="new, best-seller"/></label>
                  </div>
                  <label className="cmsCheck"><input type="checkbox" checked={productDraft.featured} onChange={e=>setProductDraft({...productDraft,featured:e.target.checked})}/> Featured product</label>
                  <div className="cmsActions"><button className="secondary" onClick={()=>{setEditingProductId(null);setProductDraft({name:'',slug:'',price:0,category:'',description:'',image:'',stock:0,featured:false,rating:0,reviews:0,tags:[]})}}>Clear</button><button className="primary" onClick={saveProduct}>{editingProductId?'Save changes':'Create product'}</button></div>
                </div>
                {products.filter(p=>p.name.toLowerCase().includes(adminSearch.toLowerCase())||p.category.toLowerCase().includes(adminSearch.toLowerCase())).map(p => (
                  <div className="tableRow" key={p.id}>
                    <img src={p.image} />
                    <div>
                      <b>{p.name}</b>
                      <small>
                        {p.category} · {p.stock} in stock
                      </small>
                    </div>
                    <strong>{money(p.price)}</strong>
                    <div className="flex items-center gap-2 text-sm">
                      <button className="iconBtn" onClick={async () => { try { const next = Math.max(0, p.stock - 1); const r = await api.put('/api/products/' + p.id + '/inventory', { stock: next }); if (r.data?.product) { setProducts(xs => xs.map(x => x.id === p.id ? r.data.product : x)); setNotice('Inventory updated.'); } } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not update inventory.'); } }} aria-label="Decrease stock">−</button>
                      <b className={p.stock <= 5 ? 'text-red-600' : ''}>{p.stock}</b>
                      <button className="iconBtn" onClick={async () => { try { const r = await api.put('/api/products/' + p.id + '/inventory', { stock: p.stock + 1 }); if (r.data?.product) { setProducts(xs => xs.map(x => x.id === p.id ? r.data.product : x)); setNotice('Inventory updated.'); } } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not update inventory.'); } }} aria-label="Increase stock">+</button>
                    </div>
                    <button className="iconBtn" onClick={()=>{setEditingProductId(p.id);setProductDraft({...p});document.getElementById('productEditor')?.scrollIntoView({behavior:'smooth',block:'start'})}}><Edit3 size={16} /></button>
                    <button className="iconBtn danger" onClick={()=>deleteProduct(p.id)}><Trash2 size={16} /></button>
                  </div>
                ))}

              </div>
            )}
            {adminTab === 'coupons' && (
              <div className="panel cmsPanel">
                <div className="panelHead"><div><h3>Coupon rules</h3><span>Real server-enforced rules</span></div></div>
                <div id="couponEditor" className="cmsEditor">
                  <div className="cmsEditorHead"><div><span className="eyebrow">{editingCouponId?'Edit coupon':'New coupon'}</span><h3>{editingCouponId?'Update an existing rule':'Create a real coupon'}</h3></div>{editingCouponId&&<button className="textBtn" onClick={()=>setEditingCouponId(null)}>Cancel</button>}</div>
                  <div className="cmsFormGrid">
                    <label><span>Code</span><input value={couponDraft.code} onChange={e=>setCouponDraft({...couponDraft,code:e.target.value.toUpperCase()})} placeholder="WELCOME15"/></label>
                    <label><span>Type</span><select value={couponDraft.type} onChange={e=>setCouponDraft({...couponDraft,type:e.target.value as 'percent'|'fixed'})}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
                    <label><span>Value</span><input type="number" min="0" value={couponDraft.value||''} onChange={e=>setCouponDraft({...couponDraft,value:Number(e.target.value)})}/></label>
                    <label><span>Minimum subtotal</span><input type="number" min="0" value={couponDraft.minSubtotal||''} onChange={e=>setCouponDraft({...couponDraft,minSubtotal:Number(e.target.value)})}/></label>
                    <label><span>Expires</span><input type="date" value={couponDraft.expiresAt} onChange={e=>setCouponDraft({...couponDraft,expiresAt:e.target.value})}/></label>
                    <label><span>Usage limit</span><input type="number" min="1" value={couponDraft.usageLimit||''} onChange={e=>setCouponDraft({...couponDraft,usageLimit:Number(e.target.value)||undefined})}/></label>
                    <label><span>Per customer</span><input type="number" min="1" value={couponDraft.perUserLimit||''} onChange={e=>setCouponDraft({...couponDraft,perUserLimit:Number(e.target.value)||undefined})}/></label>
                  </div>
                  <label className="cmsCheck"><input type="checkbox" checked={couponDraft.active} onChange={e=>setCouponDraft({...couponDraft,active:e.target.checked})}/> Active coupon</label>
                  <div className="cmsActions"><button className="secondary" onClick={()=>setEditingCouponId(null)}>Clear</button><button className="primary" onClick={saveCoupon}>{editingCouponId?'Save changes':'Create coupon'}</button></div>
                </div>
                {coupons.map(c => (
                  <div className="tableRow couponRow" key={c.id}>
                    <Tag size={18} />
                    <div>
                      <b>{c.code}</b>
                      <small>
                        {c.type === 'percent'
                          ? c.value + '% off'
                          : money(c.value) + ' off'}{' '}
                        · min {money(c.minSubtotal)}
                      </small>
                    </div>
                    <span className={c.active ? 'statusOn' : 'statusOff'}>{c.active ? 'Active' : 'Inactive'}</span>
                    <button className="iconBtn" onClick={()=>{setEditingCouponId(c.id);setCouponDraft({...c});document.getElementById('couponEditor')?.scrollIntoView({behavior:'smooth',block:'start'})}}><Edit3 size={16}/></button>
                    <button className="iconBtn danger" onClick={()=>deleteCoupon(c.id)}><Trash2 size={16}/></button>
                  </div>
                ))}
                <div id="newCoupon" className="inlineCreate">
                  <h3>Create coupon</h3>
                  
                </div>
              </div>
            )}
            {adminTab === 'content' && (
              <div className="panel cmsPanel">
                <div className="panelHead"><div><h3>Storefront content</h3><span>Edit the live website without touching code.</span></div></div>
                <div className="cmsEditor">
                  <div className="cmsFormGrid">
                    <label><span>Store name</span><input value={settings.storeName} onChange={e=>setSettings({...settings,storeName:e.target.value})}/></label>
                    <label><span>Announcement bar</span><input value={settings.announcement} onChange={e=>setSettings({...settings,announcement:e.target.value})}/></label>
                    <label><span>Hero title</span><input value={settings.heroTitle} onChange={e=>setSettings({...settings,heroTitle:e.target.value})}/></label>
                    <label><span>Hero accent</span><input value={settings.heroAccent} onChange={e=>setSettings({...settings,heroAccent:e.target.value})}/></label>
                    <label><span>Free delivery threshold</span><input type="number" min="0" value={settings.deliveryThreshold} onChange={e=>setSettings({...settings,deliveryThreshold:Number(e.target.value)})}/></label>
                    <label><span>Delivery fee</span><input type="number" min="0" value={settings.deliveryFee} onChange={e=>setSettings({...settings,deliveryFee:Number(e.target.value)})}/></label>
                    <label className="full"><span>Hero body</span><textarea value={settings.heroBody} onChange={e=>setSettings({...settings,heroBody:e.target.value})}/></label>
                    <label className="full"><span>Footer text</span><textarea value={settings.footerText} onChange={e=>setSettings({...settings,footerText:e.target.value})}/></label>
                  </div>
                  <div className="cmsActions"><button className="secondary" onClick={async()=>{const r=await api.get('/api/settings');if(r.data?.settings)setSettings({...defaultSettings,...r.data.settings})}}>Discard</button><button className="primary" onClick={saveSettings}>Publish content</button></div>
                </div>
              </div>
            )}
            {adminTab === 'orders' && (
              <div className="panel">
                <div className="panelHead">
                  <h3>Orders</h3>
                  <span>Live records</span>
                </div>
                {orders.length ? (
                  orders.map(o => (
                    <div className="tableRow" key={o.id}>
                      <ShoppingBag size={18} />
                      <div>
                        <b>#{o.id.slice(-7)}</b>
                        <small>
                          {o.email} · {o.items.length} items
                        </small>
                      </div>
                      <strong>{money(o.total)}</strong>
                      <span className="statusOn">{o.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty">
                    No orders yet. Place an order from the storefront to test
                    the full flow.
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}

      {cartOpen && (
        <>
          <div className="scrim" onClick={() => setCartOpen(false)} />
          <aside className="cartDrawer">
            <div className="drawerHead">
              <h2>
                Your bag <span>{cart.length}</span>
              </h2>
              <button className="iconBtn" onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            {cart.length ? (
              <>
                <div className="cartItems">
                  {cart.map(i => (
                    <div className="cartItem" key={i.id}>
                      <img src={i.image} />
                      <div>
                        <b>{i.name}</b>
                        <small>{money(i.price)}</small>
                        <div className="qty">
                          <button onClick={() => updateQty(i.id, -1)}>−</button>
                          <span>{i.quantity}</span>
                          <button onClick={() => updateQty(i.id, 1)}>+</button>
                          <button
                            className="remove"
                            onClick={() => remove(i.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="drawerFoot">
                  <div>
                    <span>Subtotal</span>
                    <b>{money(subtotal)}</b>
                  </div>
                  <small>Taxes calculated at checkout.</small>
                  <button
                    className="primary wide"
                    onClick={() => {
                      setCartOpen(false);
                      setPage('checkout');
                    }}
                  >
                    Checkout <ChevronRight size={17} />
                  </button>
                </div>
              </>
            ) : (
              <div className="emptyBag">
                <ShoppingBag size={35} />
                <h3>Your bag is empty</h3>
                <p>Discover something worth keeping.</p>
                <button
                  className="primary"
                  onClick={() => {
                    setCartOpen(false);
                    setPage('shop');
                  }}
                >
                  Shop now
                </button>
              </div>
            )}
          </aside>
        </>
      )}
      <div className="livePill" title="Live catalog and order synchronization">
        <span className={liveState === 'live' ? 'liveDot' : 'liveDot offline'} /> {liveState === 'live' ? 'Live sync' : liveState === 'connecting' ? 'Connecting…' : 'Offline mode'}
      </div>
      <footer>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row justify-between gap-5">
          <div>
            <div className="brand">
              VELORA<span>.</span>
            </div>
            <small>{settings.footerText}</small>
          </div>
          <div className="footerLinks">
            <span>Shipping</span>
            <span>Returns</span>
            <span>Privacy</span>
            <span>Contact</span>
          </div>
          <small>© 2026 {settings.storeName} Studio</small>
        </div>
      </footer>
    </div>
  );
}

function ProductCard({
  p,
  onOpen,
  onAdd,
}: {
  p: Product;
  onOpen: (id: string) => void;
  onAdd: (p: Product) => void;
}) {
  return (
    <article className="productCard">
      <button className="imageWrap" onClick={() => onOpen(p.id)}>
        <img src={p.image} />
        {p.compareAt && <span className="sale">Sale</span>}
        <span className="quick">
          <Plus size={17} />
        </span>
      </button>
      <div className="cardInfo">
        <div>
          <span>{p.category}</span>
          <h3>{p.name}</h3>
        </div>
        <div className="cardPrice">
          <b>{money(p.price)}</b>
          {p.compareAt && <del>{money(p.compareAt)}</del>}
        </div>
      </div>
      <button className="addLine" onClick={() => onAdd(p)}>
        Add to bag <Plus size={15} />
      </button>
    </article>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: any;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="stat">
      <div className="statIcon">
        <Icon size={18} />
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{trend}</span>
    </div>
  );
}

export default App;
