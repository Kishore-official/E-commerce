import React from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent } from './card';

export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  onClick,
}: StatsCardProps) {
  return (
    <Card className={className} onClick={onClick}>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-1 text-xs font-medium',
                trend.value >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">{icon}</div>
        )}
      </CardContent>
    </Card>
  );
}
