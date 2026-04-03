'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useApiGet } from '../hooks/use-api';
import { apiPatch } from '../lib/api-client';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
  totalItems: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData, mutate: mutateCount } = useApiGet<{ count: number }>(
    '/notifications/unread-count',
    { refreshInterval: 30000 },
  );

  const { data: notifData, mutate: mutateList } = useApiGet<NotificationsResponse>(
    open ? '/notifications?limit=20' : null,
  );

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData?.data ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    await apiPatch(`/notifications/${id}/read`, {});
    mutateCount();
    mutateList();
  };

  const handleMarkAllAsRead = async () => {
    await apiPatch('/notifications/read-all', {});
    mutateCount();
    mutateList();
  };

  return (
    <div ref={ref} style={{ position: 'relative' }} className={className}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1px solid #e8e2d6',
          background: open ? '#faf7f2' : '#ffffff',
          cursor: 'pointer',
          color: open ? '#374151' : '#9ca3af',
          transition: 'background 0.13s ease, border-color 0.13s ease, color 0.13s ease',
          position: 'relative',
        }}
        title="Notifications"
      >
        <Bell size={15} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 420,
            background: '#fff',
            border: '1px solid #e8e2d6',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #f0ebe0',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1614' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.68rem',
                  color: '#6366f1',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <CheckCheck size={12} strokeWidth={2} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: '#8a8278',
                  fontSize: '0.78rem',
                }}
              >
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '10px 16px',
                    borderBottom: '1px solid #f8f5f0',
                    background: notif.isRead ? 'transparent' : '#faf7f2',
                    cursor: notif.isRead ? 'default' : 'pointer',
                    transition: 'background 0.1s ease',
                  }}
                >
                  {/* Unread indicator */}
                  <div style={{ paddingTop: 5, flexShrink: 0, width: 8 }}>
                    {!notif.isRead && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#6366f1',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: notif.isRead ? 400 : 600,
                        color: '#1a1614',
                        marginBottom: 2,
                      }}
                    >
                      {notif.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#8a8278',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.message}
                    </div>
                    <div
                      style={{
                        fontSize: '0.62rem',
                        color: '#b0a89e',
                        marginTop: 3,
                      }}
                    >
                      {timeAgo(notif.createdAt)}
                    </div>
                  </div>
                  {!notif.isRead && (
                    <div style={{ paddingTop: 4, flexShrink: 0 }}>
                      <Check size={12} strokeWidth={2} color="#b0a89e" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
