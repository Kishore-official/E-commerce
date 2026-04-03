'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataTable,
  Badge,
  Button,
  SearchInput,
  Select,
  Modal,
  FormField,
  Textarea,
  useApiList,
  useToast,
  usePagination,
  useDebounce,
  buildQueryString,
  apiPatch,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { VendorStatus } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface VendorRow {
  id: string;
  businessName: string;
  businessEmail: string;
  status: VendorStatus;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: VendorStatus.PENDING },
  { label: 'Approved', value: VendorStatus.APPROVED },
  { label: 'Suspended', value: VendorStatus.SUSPENDED },
  { label: 'Rejected', value: VendorStatus.REJECTED },
];

const statusBadgeVariant: Record<VendorStatus, 'blue' | 'green' | 'yellow' | 'red'> = {
  [VendorStatus.PENDING]: 'blue',
  [VendorStatus.APPROVED]: 'green',
  [VendorStatus.SUSPENDED]: 'yellow',
  [VendorStatus.REJECTED]: 'red',
};

export default function VendorsPage() {
  const router = useRouter();
  const { page, limit, setPage } = usePagination();
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const [actionVendor, setActionVendor] = useState<VendorRow | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const qs = buildQueryString({
    page,
    limit,
    status: statusFilter,
  });
  const { data, mutate, isLoading } = useApiList<VendorRow>(`/admin/identity/vendors${qs}`);

  const handleAction = async () => {
    if (!actionVendor || !actionType) return;
    setSaving(true);
    try {
      const body = actionType === 'approve' ? {} : { reason };
      await apiPatch(`/admin/identity/vendors/${actionVendor.id}/${actionType}`, body);
      addToast('success', `Vendor ${actionType}ed successfully`);
      mutate();
      setActionVendor(null);
      setActionType(null);
      setReason('');
    } catch {
      addToast('error', `Failed to ${actionType} vendor`);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<VendorRow>[] = [
    { key: 'businessName', header: 'Business Name' },
    { key: 'businessEmail', header: 'Business Email' },
    {
      key: 'owner',
      header: 'Owner',
      render: (v) => v.user ? `${v.user.firstName} ${v.user.lastName}` : '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge variant={statusBadgeVariant[v.status]}>
          {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      render: (v) => formatDate(v.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (v) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vendors/${v.id}`);
            }}
          >
            View
          </Button>
          {v.status === VendorStatus.PENDING && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionVendor(v);
                  setActionType('approve');
                }}
              >
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionVendor(v);
                  setActionType('reject');
                }}
              >
                Reject
              </Button>
            </>
          )}
          {v.status === VendorStatus.APPROVED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setActionVendor(v);
                setActionType('suspend');
              }}
            >
              Suspend
            </Button>
          )}
          {v.status === VendorStatus.SUSPENDED && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setActionVendor(v);
                setActionType('approve');
              }}
            >
              Re-approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Vendors</h1>
          <p className={s.pageDesc}>Manage vendor accounts</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.meta?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="No vendors found"
        onRowClick={(v) => router.push(`/vendors/${v.id}`)}
      />

      <Modal
        open={!!actionVendor && actionType !== null}
        onClose={() => {
          setActionVendor(null);
          setActionType(null);
          setReason('');
        }}
        title={
          actionType === 'approve'
            ? 'Approve Vendor'
            : actionType === 'reject'
              ? 'Reject Vendor'
              : 'Suspend Vendor'
        }
        size="sm"
      >
        {actionType !== 'approve' && (
          <FormField
            label="Reason"
            htmlFor="reason"
            description="Required: Provide a reason for this action."
          >
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for this action..."
              rows={3}
              required
            />
          </FormField>
        )}
        {actionType === 'approve' && (
          <p className="text-sm text-gray-600">
            Are you sure you want to approve this vendor? They will be able to access the vendor portal immediately.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setActionVendor(null);
              setActionType(null);
              setReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAction}
            loading={saving}
            disabled={actionType !== 'approve' && reason.trim() === ''}
          >
            {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Suspend'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
