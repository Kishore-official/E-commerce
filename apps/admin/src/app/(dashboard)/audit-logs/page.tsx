'use client';

import { useState } from 'react';
import {
  DataTable,
  Select,
  useApiList,
  usePagination,
  buildQueryString,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import s from '../../admin.module.css';

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  createdAt: string;
}

const entityTypeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Vendor', value: 'Vendor' },
  { label: 'Product', value: 'Product' },
  { label: 'Offer', value: 'Offer' },
  { label: 'Review', value: 'Review' },
  { label: 'User', value: 'User' },
];

const actionOptions = [
  { label: 'All Actions', value: '' },
  { label: 'Vendor Approved', value: 'vendor.approved' },
  { label: 'Vendor Rejected', value: 'vendor.rejected' },
  { label: 'Vendor Suspended', value: 'vendor.suspended' },
  { label: 'Product Approved', value: 'product.approved' },
  { label: 'Product Rejected', value: 'product.rejected' },
  { label: 'Product Submitted', value: 'product.submitted_for_review' },
  { label: 'Offer Approved', value: 'offer.approved' },
  { label: 'Offer Rejected', value: 'offer.rejected' },
  { label: 'Review Approved', value: 'review.approved' },
  { label: 'Review Rejected', value: 'review.rejected' },
  { label: 'User Role Changed', value: 'user.role_changed' },
  { label: 'User Status Changed', value: 'user.status_changed' },
];

export default function AuditLogsPage() {
  const { page, limit, setPage } = usePagination();
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const qs = buildQueryString({ page, limit, entityType, action });
  const { data, isLoading } = useApiList<AuditLogRow>(`/admin/audit-logs${qs}`);

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => formatDate(log.createdAt),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <span className="capitalize">{log.action.replace('.', ' ')}</span>
      ),
    },
    { key: 'entityType', header: 'Entity Type' },
    {
      key: 'entityId',
      header: 'Entity ID',
      render: (log) => <span className="font-mono text-xs">{log.entityId.slice(0, 8)}</span>,
    },
    {
      key: 'userId',
      header: 'User ID',
      render: (log) => (
        <span className="font-mono text-xs">{log.userId ? log.userId.slice(0, 8) : '-'}</span>
      ),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Audit Logs</h1>
          <p className={s.pageDesc}>View all admin actions and changes</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          options={entityTypeOptions}
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="w-48"
        />
        <Select
          options={actionOptions}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-48"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="No audit logs found"
      />
    </div>
  );
}
