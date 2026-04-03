'use client';

import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Modal,
  FormField,
  Textarea,
  useApiGet,
  useToast,
  formatDate,
  apiPatch,
} from '@ecommerce/ui-kit';
import { VendorStatus } from '@ecommerce/shared-types';

interface VendorDetail {
  id: string;
  businessName: string;
  businessEmail: string;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  status: VendorStatus;
  commissionRate: number;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

const statusBadgeVariant: Record<VendorStatus, 'blue' | 'green' | 'yellow' | 'red'> = {
  [VendorStatus.PENDING]: 'blue',
  [VendorStatus.APPROVED]: 'green',
  [VendorStatus.SUSPENDED]: 'yellow',
  [VendorStatus.REJECTED]: 'red',
};

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const { addToast } = useToast();
  const { data: vendor, mutate, isLoading } = useApiGet<VendorDetail>(
    `/admin/identity/vendors/${params.id}`,
  );

  const [pendingAction, setPendingAction] = useState<'reject' | 'suspend' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAction = async (action: 'approve' | 'reject' | 'suspend', reason?: string) => {
    setSaving(true);
    try {
      const body = action === 'approve' ? {} : { reason };
      await apiPatch(`/admin/identity/vendors/${params.id}/${action}`, body);
      addToast('success', `Vendor ${action}ed successfully`);
      mutate();
    } catch {
      addToast('error', `Failed to ${action} vendor`);
    } finally {
      setSaving(false);
    }
  };

  const handleReasonSubmit = async () => {
    if (!pendingAction || !actionReason.trim()) return;
    await handleAction(pendingAction, actionReason.trim());
    setPendingAction(null);
    setActionReason('');
  };

  if (isLoading || !vendor) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={vendor.businessName}
        description="Vendor account details"
        actions={
          <div className="flex gap-2">
            {vendor.status === VendorStatus.PENDING && (
              <>
                <Button onClick={() => handleAction('approve')} loading={saving}>
                  Approve
                </Button>
                <Button variant="secondary" onClick={() => setPendingAction('reject')}>
                  Reject
                </Button>
              </>
            )}
            {vendor.status === VendorStatus.APPROVED && (
              <Button variant="secondary" onClick={() => setPendingAction('suspend')}>
                Suspend
              </Button>
            )}
            {vendor.status === VendorStatus.SUSPENDED && (
              <Button onClick={() => handleAction('approve')} loading={saving}>
                Re-approve
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Business Name</span>
              <p className="text-sm font-medium">{vendor.businessName}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Business Email</span>
              <p className="text-sm font-medium">{vendor.businessEmail}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Phone</span>
              <p className="text-sm font-medium">{vendor.phone || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Status</span>
              <div className="mt-1">
                <Badge variant={statusBadgeVariant[vendor.status]}>
                  {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
                </Badge>
              </div>
            </div>
            {vendor.description && (
              <div>
                <span className="text-sm text-gray-500">Description</span>
                <p className="text-sm">{vendor.description}</p>
              </div>
            )}
            {vendor.rejectionReason && (
              <div>
                <span className="text-sm text-gray-500">Rejection/Suspension Reason</span>
                <p className="text-sm text-red-600">{vendor.rejectionReason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Owner Name</span>
              <p className="text-sm font-medium">
                {vendor.user ? `${vendor.user.firstName} ${vendor.user.lastName}` : '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Owner Email</span>
              <p className="text-sm font-medium">{vendor.user?.email || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Commission Rate</span>
              <p className="text-sm font-medium">{vendor.commissionRate}%</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Registered</span>
              <p className="text-sm font-medium">{formatDate(vendor.createdAt)}</p>
            </div>
            {vendor.approvedAt && (
              <div>
                <span className="text-sm text-gray-500">Approved At</span>
                <p className="text-sm font-medium">{formatDate(vendor.approvedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={pendingAction !== null}
        onClose={() => {
          setPendingAction(null);
          setActionReason('');
        }}
        title={pendingAction === 'reject' ? 'Reject Vendor' : 'Suspend Vendor'}
        size="sm"
      >
        <FormField
          label="Reason"
          htmlFor="actionReason"
          description={
            pendingAction === 'reject'
              ? 'Required: Explain why this vendor is being rejected.'
              : 'Required: Explain why this vendor is being suspended.'
          }
        >
          <Textarea
            id="actionReason"
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="Provide a reason..."
            rows={3}
            required
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setPendingAction(null);
              setActionReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReasonSubmit}
            loading={saving}
            disabled={!actionReason.trim()}
          >
            {pendingAction === 'reject' ? 'Reject' : 'Suspend'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

