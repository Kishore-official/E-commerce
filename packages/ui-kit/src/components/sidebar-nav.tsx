'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../lib/cn';

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
  className?: string;
}

export function SidebarNav({ items, collapsed, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
            )}
            title={collapsed ? item.label : undefined}
          >
            {item.icon && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {item.icon}
              </span>
            )}
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.badge !== undefined && (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
