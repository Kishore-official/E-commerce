'use client';

import { useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { resolveImageUrl } from '@ecommerce/ui-kit';
import s from '../app/store.module.css';

interface ProductImage {
  url: string;
  altText: string | null;
}

interface ProductCardImageProps {
  images: ProductImage[];
  productName: string;
  fallbackUrl?: string | null;
  fallbackAlt?: string | null;
}

export function ProductCardImage({ images, productName, fallbackUrl, fallbackAlt }: ProductCardImageProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const imageList = images.length > 0
    ? images
    : fallbackUrl
      ? [{ url: fallbackUrl, altText: fallbackAlt || null }]
      : [];

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (imageList.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const segmentWidth = rect.width / imageList.length;
    const newIndex = Math.min(Math.floor(x / segmentWidth), imageList.length - 1);
    setActiveIndex(newIndex);
  }, [imageList.length]);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(0);
  }, []);

  if (imageList.length === 0) {
    return (
      <div className={s.productCardImgPlaceholder}>
        <Package size={32} strokeWidth={1} color="#c8c0b4" />
      </div>
    );
  }

  const currentImage = imageList[activeIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <img
        src={resolveImageUrl(currentImage.url)}
        alt={currentImage.altText || productName}
        className={s.productCardImg}
      />
      {imageList.length > 1 && (
        <div className={s.productCardDots}>
          {imageList.map((_, idx) => (
            <span
              key={idx}
              className={`${s.productCardDot} ${idx === activeIndex ? s.productCardDotActive : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
