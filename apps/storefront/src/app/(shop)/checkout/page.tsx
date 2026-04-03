'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Truck, ArrowRight } from 'lucide-react';
import {
  Input,
  FormField,
  useToast,
  useAuth,
  apiPost,
  useApiGet,
  Spinner,
  EmptyState,
  Button,
  formatPrice,
} from '@ecommerce/ui-kit';
import s from '../../store.module.css';

interface CartItem {
  id: string;
  offerId: string;
  quantity: number;
  priceSnapshot: number;
  currency: string;
  productName: string;
  variantName: string;
}

interface Cart {
  id: string;
  items: CartItem[];
}

interface Order {
  id: string;
  orderNumber: string;
}

interface BuyNowData {
  offerId: string;
  quantity: number;
  priceAmount: number;
  currency: string;
  productName: string;
  variantName: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const isBuyNow = searchParams.get('buyNow') === 'true';

  const buyNowItem = useMemo<BuyNowData | null>(() => {
    if (!isBuyNow) return null;
    try {
      const raw = sessionStorage.getItem('buyNowItem');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [isBuyNow]);

  const { data: cart, isLoading: cartLoading } = useApiGet<Cart>(
    authLoading || isBuyNow ? null : '/cart',
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      addToast('error', 'Please sign in to complete your order');
      router.replace('/login?returnUrl=/checkout');
    }
  }, [authLoading, isAuthenticated]);

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    name: '',
    line1: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  // Build a unified items list for display
  const displayItems: CartItem[] = useMemo(() => {
    if (isBuyNow && buyNowItem) {
      return [{
        id: 'buy-now',
        offerId: buyNowItem.offerId,
        quantity: buyNowItem.quantity,
        priceSnapshot: buyNowItem.priceAmount,
        currency: buyNowItem.currency,
        productName: buyNowItem.productName,
        variantName: buyNowItem.variantName,
      }];
    }
    return cart?.items || [];
  }, [isBuyNow, buyNowItem, cart]);

  const currency = displayItems[0]?.currency || 'INR';
  const subtotal = displayItems.reduce(
    (sum, item) => sum + item.priceSnapshot * item.quantity,
    0,
  );
  const taxRate = currency === 'INR' ? 0.18 : 0.15;
  const vatAmount = Math.round(subtotal * taxRate);
  const grandTotal = subtotal + vatAmount;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderPayload: Record<string, unknown> = {
        shippingAddress: {
          ...address,
          countryCode: currency === 'INR' ? 'IN' : 'SA',
        },
      };

      if (isBuyNow && buyNowItem) {
        orderPayload.buyNowItems = [{
          offerId: buyNowItem.offerId,
          quantity: buyNowItem.quantity,
        }];
      }

      const order = await apiPost<Order>('/orders', orderPayload);

      await apiPost('/payments/initiate', {
        orderId: order.id,
        paymentMethod: 'card',
      });

      // Clean up buy-now data
      sessionStorage.removeItem('buyNowItem');

      addToast('success', 'Order placed successfully!');
      router.push(`/checkout/confirmation?orderId=${order.id}`);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        addToast('error', 'Your session has expired. Please sign in again.');
        router.push('/login?returnUrl=/checkout');
        return;
      }
      const message = error?.response?.data?.message || 'Failed to place order';
      addToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (!isAuthenticated && !cartLoading)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isBuyNow && cartLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div>
        <h1 className={s.cartTitle}>Checkout</h1>
        <EmptyState
          title="Your cart is empty"
          description="Add some products to your cart before checkout"
          action={
            <Link href="/search">
              <Button>Browse Products</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.cartTitle}>Checkout</h1>

      <div className={s.checkoutGrid}>
        {/* Shipping Address Form */}
        <div className={s.checkoutFormCard}>
          <h2 className={s.checkoutFormTitle}>Shipping Address</h2>
          <form onSubmit={handlePlaceOrder} id="checkout-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <FormField label="Full Name" htmlFor="name" required>
              <Input
                id="name"
                value={address.name}
                onChange={(e) => setAddress({ ...address, name: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </FormField>
            <FormField label="Address Line 1" htmlFor="line1" required>
              <Input
                id="line1"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                placeholder="Street address"
                required
              />
            </FormField>
            <div className={s.checkoutFormRow}>
              <FormField label="City" htmlFor="city" required>
                <Input
                  id="city"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="City"
                  required
                />
              </FormField>
              <FormField label="Postal Code" htmlFor="postal" required>
                <Input
                  id="postal"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="Postal code"
                  required
                />
              </FormField>
            </div>
            <FormField label="Phone" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                placeholder="Phone number"
              />
            </FormField>
          </form>

          {/* Trust signals */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e8e2d6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#8a8278' }}>
              <ShieldCheck size={14} strokeWidth={1.5} color="#c4933f" />
              Secure Checkout
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#8a8278' }}>
              <Truck size={14} strokeWidth={1.5} color="#c4933f" />
              Free Shipping
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className={s.orderSummaryBox}>
          <h3 className={s.orderSummaryTitle}>Order Summary</h3>

          {/* Items */}
          <div>
            {displayItems.map((item) => (
              <div key={item.id} className={s.orderItem}>
                <div className={s.orderItemInfo}>
                  <div className={s.orderItemName}>{item.productName}</div>
                  {item.variantName && (
                    <div className={s.orderItemVariant}>{item.variantName}</div>
                  )}
                  <div className={s.orderItemQty}>Qty: {item.quantity}</div>
                </div>
                <div className={s.orderItemPrice}>
                  {formatPrice(item.priceSnapshot * item.quantity, item.currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className={s.orderTotals}>
            <div className={s.orderTotalRow}>
              <span className={s.orderTotalLabel}>Subtotal</span>
              <span className={s.orderTotalValue}>{formatPrice(subtotal, currency)}</span>
            </div>
            <div className={s.orderTotalRow}>
              <span className={s.orderTotalLabel}>{currency === 'INR' ? 'GST (18%)' : 'VAT (15%)'}</span>
              <span className={s.orderTotalValue}>{formatPrice(vatAmount, currency)}</span>
            </div>
            <div className={s.orderGrandTotal}>
              <span className={s.orderGrandTotalLabel}>Total</span>
              <span className={s.orderGrandTotalValue}>{formatPrice(grandTotal, currency)}</span>
            </div>
          </div>

          {/* Place Order button */}
          <button
            type="submit"
            form="checkout-form"
            className={s.placeOrderBtn}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : (
              <>Place Order <ArrowRight size={14} strokeWidth={1.5} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Spinner size="lg" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
