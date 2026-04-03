'use client';

import { useState } from 'react';
import {
  DataTable,
  Badge,
  Button,
  SearchInput,
  Select,
  Modal,
  FormField,
  useApiList,
  useToast,
  usePagination,
  useDebounce,
  buildQueryString,
  apiPatch,
  formatDate,
  type Column,
} from '@ecommerce/ui-kit';
import { ROLE_LABELS } from '@ecommerce/ui-kit';
import { UserRole } from '@ecommerce/shared-types';
import s from '../../admin.module.css';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export default function UsersPage() {
  const { page, limit, setPage } = usePagination();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const debouncedSearch = useDebounce(search);
  const { addToast } = useToast();

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const qs = buildQueryString({
    page,
    limit,
    search: debouncedSearch,
    role: roleFilter,
  });
  const { data, mutate, isLoading } = useApiList<UserRow>(`/admin/users${qs}`);

  const columns: Column<UserRow>[] = [
    { key: 'email', header: 'Email' },
    {
      key: 'name',
      header: 'Name',
      render: (u) => `${u.firstName} ${u.lastName}`,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <Badge variant="blue">{ROLE_LABELS[u.role]}</Badge>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.isActive ? 'green' : 'red'}>
          {u.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u) => formatDate(u.createdAt),
    },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditUser(u);
              setNewRole(u.role);
            }}
          >
            Edit Role
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await apiPatch(`/admin/users/${u.id}/status`, { isActive: !u.isActive });
                addToast('success', `User ${u.isActive ? 'deactivated' : 'activated'}`);
                mutate();
              } catch {
                addToast('error', 'Failed to update user status');
              }
            }}
          >
            {u.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  const handleSaveRole = async () => {
    if (!editUser || !newRole) return;
    setSaving(true);
    try {
      await apiPatch(`/admin/users/${editUser.id}/role`, { role: newRole });
      addToast('success', 'Role updated');
      mutate();
      setEditUser(null);
    } catch {
      addToast('error', 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.pageHeader}>
        <div className={s.pageHeaderLeft}>
          <h1 className={s.pageTitle}>Users</h1>
          <p className={s.pageDesc}>Manage platform users</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
          className="w-64"
        />
        <Select
          options={[{ label: 'All Roles', value: '' }, ...roleOptions]}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
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
        emptyTitle="No users found"
      />

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change User Role" size="sm">
        <FormField label="Role" htmlFor="role">
          <Select
            id="role"
            options={roleOptions}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
        </FormField>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEditUser(null)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRole} loading={saving}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
