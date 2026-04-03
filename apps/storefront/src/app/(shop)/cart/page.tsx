'use client';

import Link from 'next/link';
import { ShoppingBag, Package, Minus, Plus, ArrowRight } from 'lucide-react';
import {
  Spinner,
  PriceDisplay,
  useApiGet,
  useToast,
  useAuth,
  apiPatch,
  apiDelete,
  resolveImageUrl,
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
  productSlug: string;
  imageUrl: string | null;
}

interface Cart {
  id: string;
  items: CartItem[];
}

export default function CartPage() {
  const { addToast } = useToast();
  const { isLoading: authLoading } = useAuth();
  const { data: cart, isLoading, mutate } = useApiGet<Cart>(authLoading ? null : '/cart');

  const items: CartItem[] = cart?.items ?? [];

  const totalAmount = items.reduce(
    (sum: number, item: CartItem) => sum + item.priceSnapshot * item.quantity,
    0,
  );

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await apiPatch(`/cart/items/${itemId}`, { quantity });
      mutate();
    } catch {
      addToast('error', 'Failed to update quantity');
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      await apiDelete(`/cart/items/${itemId}`);
      addToast('success', 'Item removed');
      mutate();
    } catch {
      addToast('error', 'Failed to remove item');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={s.cartEmpty}>
        <ShoppingBag size={40} strokeWidth={1} color="#c8c0b4" style={{ margin: '0 auto 20px' }} />
        <h2 className={s.cartEmptyTitle}>Your cart is empty</h2>
        <p className={s.cartEmptyText}>
          Discover exceptional products from our curated marketplace
        </p>
        <Link href="/search" className={s.cartEmptyLink}>
          Browse Collection <ArrowRight size={14} strokeWidth={1.5} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Page title */}
      <h1 className={s.cartTitle}>Shopping Cart</h1>

      <div className={s.cartLayoutGrid}>

        {/* Cart items */}
        <div>
          {items.map((item: CartItem) => (
            <div key={item.id} className={s.cartItem}>
              {/* Image */}
              {item.imageUrl ? (
                <img src={resolveImageUrl(item.imageUrl)} alt={item.productName} className={s.cartItemImg} />
              ) : (
                <div className={s.cartItemImgPlaceholder}>
                  <Package size={24} strokeWidth={1} color="#c8c0b4" />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/products/${item.productSlug}`} className={s.cartItemName}>
                  {item.productName}
                </Link>
                {item.variantName && (
                  <p className={s.cartItemVariant}>{item.variantName}</p>
                )}
                <PriceDisplay amount={item.priceSnapshot} size="sm" />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                {/* Qty */}
                <div className={s.qtyControl}>
                  <button
                    className={s.qtyBtn}
                    onClick={() => handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    title="Decrease"
                  >
                    <Minus size={12} strokeWidth={2} />
                  </button>
                  <span className={s.qtyDisplay}>{item.quantity}</span>
                  <button
                    className={`${s.qtyBtn} ${s.qtyBtnRight}`}
                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                    title="Increase"
                  >
                    <Plus size={12} strokeWidth={2} />
                  </button>
                </div>

                {/* Line total */}
                <PriceDisplay amount={item.priceSnapshot * item.quantity} />

                {/* Remove */}
                <button className={s.removeBtn} onClick={() => handleRemove(item.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className={s.cartSummaryBox}>
          <h3 className={s.cartSummaryTitle}>Order Summary</h3>

          <div className={s.cartSummaryRow}>
            <span>Items ({items.length})</span>
            <PriceDisplay amount={totalAmount} size="sm" />
          </div>
          <div className={s.cartSummaryRow}>
            <span>Shipping</span>
            <span style={{ color: '#4a8c6a', fontSize: '0.8rem', fontWeight: 500 }}>Free</span>
          </div>

          <div className={s.cartSummaryTotal}>
            <span className={s.cartSummaryTotalLabel}>Total</span>
            <PriceDisplay amount={totalAmount} size="lg" />
          </div>

          <Link href="/checkout" className={s.checkoutBtn}>
            Proceed to Checkout <ArrowRight size={14} strokeWidth={1.5} />
          </Link>

          <Link
            href="/search"
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '12px',
              fontSize: '0.72rem',
              letterSpacing: '0.08em',
              color: '#8a8278',
              textDecoration: 'none',
            }}
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
