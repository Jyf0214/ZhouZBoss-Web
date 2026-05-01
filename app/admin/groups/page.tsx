'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import {
  createUserGroup,
  getAllUserGroups,
  getAllUsers,
  assignUserToGroup,
  updateUserGroup,
  deleteUserGroup,
  type UserGroup,
  type UserProfile
} from '@/lib/user';
import { Button, Input, Card, Table, Modal, Form, message, Tag, Space, Checkbox, Popconfirm } from 'antd';
import { PlusOutlined, UsergroupAddOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;

export default function UserGroupsPage() {
  const router = useRouter();
  const { userRole, user } = useAuth();
  const { t } = useI18n();
  const isSudo = userRole === 'sudo' || userRole === 'admin';
  
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editForm] = Form.useForm();
  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsData, usersData] = await Promise.all([
        getAllUserGroups(),
        getAllUsers()
      ]);
      setGroups(groupsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSudo) {
      message.error(t('groups.adminOnly'));
      router.push('/');
      return;
    }
    loadData();
  }, [isSudo, router, loadData]);

  const handleCreateGroup = async (values: any) => {
    try {
      await createUserGroup(values.name, values.description || '', user?.uid || '');
      message.success(t('groups.createSuccess'));
      setIsModalOpen(false);
      form.resetFields();
      loadData();
    } catch (error) {
      message.error(t('groups.createFailed'));
    }
  };

  const handleEditGroup = async (values: any) => {
    if (!selectedGroup) return;
    try {
      await updateUserGroup(selectedGroup.id, {
        name: values.name,
        description: values.description || '',
      });
      message.success(t('groups.updateSuccess') || 'Group updated successfully');
      setIsEditModalOpen(false);
      editForm.resetFields();
      setSelectedGroup(null);
      loadData();
    } catch (error) {
      message.error(t('groups.updateFailed') || 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteUserGroup(groupId);
      message.success(t('groups.deleteSuccess') || 'Group deleted successfully');
      loadData();
    } catch (error) {
      message.error(t('groups.deleteFailed') || 'Failed to delete group');
    }
  };

  const handleAssignUsers = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;
    try {
      await Promise.all(
        selectedUsers.map(uid => assignUserToGroup(uid, selectedGroup.id))
      );
      message.success(t('groups.assignSuccess') || 'Users assigned successfully');
      setIsAssignModalOpen(false);
      setSelectedUsers([]);
      setSelectedGroup(null);
      loadData();
    } catch (error) {
      message.error(t('groups.assignFailed') || 'Failed to assign users');
    }
  };

  const openEditModal = (group: UserGroup) => {
    setSelectedGroup(group);
    editForm.setFieldsValue({
      name: group.name,
      description: group.description || '',
    });
    setIsEditModalOpen(true);
  };

  const openAssignModal = (group: UserGroup) => {
    setSelectedGroup(group);
    setSelectedUsers([]);
    setIsAssignModalOpen(true);
  };

  const columns: ColumnsType<UserGroup> = [
    {
      title: t('groups.name'),
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-bold">{text}</span>
    },
    {
      title: t('groups.description'),
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-'
    },
    {
      title: t('groups.memberCount') || 'Members',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => <Tag color="blue">{count || 0}</Tag>
    },
    {
      title: t('groups.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
    {
      title: t('common.actions') || 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isDefault = record.name === 'default' || record.name === 'admin' || record.name === 'sudo';
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<UserOutlined />}
              onClick={() => openAssignModal(record)}
              className="rounded-lg bg-zinc-900"
            >
              {t('groups.assign') || 'Assign'}
            </Button>
            <Button
              type="default"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              disabled={isDefault}
              className="rounded-lg"
            >
              {t('common.edit') || 'Edit'}
            </Button>
            <Popconfirm
              title={t('groups.deleteConfirm') || 'Delete this group?'}
              description={t('groups.deleteWarning') || 'This action cannot be undone.'}
              onConfirm={() => handleDeleteGroup(record.id)}
              okText={t('common.yes') || 'Yes'}
              cancelText={t('common.no') || 'No'}
              disabled={isDefault}
            >
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={isDefault}
                className="rounded-lg"
              >
                {t('common.delete') || 'Delete'}
              </Button>
            </Popconfirm>
          </Space>
        );
      }
    }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center">
            <UsergroupAddOutlined style={{ fontSize: '20px' }} />
          </div>
          <h1 className="text-3xl font-display font-bold text-zinc-900">{t('groups.title')}</h1>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg h-10 px-6 bg-zinc-900"
        >
          {t('groups.create')}
        </Button>
      </div>

      <Card className="rounded-2xl border-zinc-200 shadow-sm overflow-hidden">
        <Table 
          columns={columns} 
          dataSource={groups} 
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={t('groups.createNew')}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        className="rounded-2xl"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateGroup} className="mt-4">
          <Form.Item name="name" label={t('groups.name')} rules={[{ required: true, message: t('groups.namePlaceholder') }]}>
            <Input placeholder={t('groups.nameHint')} className="rounded-lg h-10" />
          </Form.Item>
          <Form.Item name="description" label={t('groups.description')}>
            <TextArea rows={4} placeholder={t('groups.descriptionPlaceholder')} className="rounded-lg" />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Space>
              <Button onClick={() => setIsModalOpen(false)} className="rounded-lg h-10">{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" className="rounded-lg h-10 bg-zinc-900">{t('common.submit')}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('groups.editGroup') || 'Edit Group'}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedGroup(null);
          editForm.resetFields();
        }}
        footer={null}
        className="rounded-2xl"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditGroup} className="mt-4">
          <Form.Item name="name" label={t('groups.name')} rules={[{ required: true, message: t('groups.namePlaceholder') }]}>
            <Input placeholder={t('groups.nameHint')} className="rounded-lg h-10" />
          </Form.Item>
          <Form.Item name="description" label={t('groups.description')}>
            <TextArea rows={4} placeholder={t('groups.descriptionPlaceholder')} className="rounded-lg" />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
            <Space>
              <Button onClick={() => {
                setIsEditModalOpen(false);
                setSelectedGroup(null);
                editForm.resetFields();
              }} className="rounded-lg h-10">{t('common.cancel')}</Button>
              <Button type="primary" htmlType="submit" className="rounded-lg h-10 bg-zinc-900">{t('common.save') || 'Save'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t('groups.assignUsers') || 'Assign Users'} - ${selectedGroup?.name || ''}`}
        open={isAssignModalOpen}
        onCancel={() => {
          setIsAssignModalOpen(false);
          setSelectedGroup(null);
          setSelectedUsers([]);
        }}
        footer={null}
        className="rounded-2xl"
        width={600}
      >
        <div className="mt-4">
          <p className="mb-4 text-zinc-600">{t('groups.selectUsers') || 'Select users to assign to this group:'}</p>
          <div className="max-h-64 overflow-y-auto border border-zinc-200 rounded-lg p-2">
            {users.map((user) => (
              <div key={user.uid} className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-lg">
                <Checkbox
                  checked={selectedUsers.includes(user.uid)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers([...selectedUsers, user.uid]);
                    } else {
                      setSelectedUsers(selectedUsers.filter(uid => uid !== user.uid));
                    }
                  }}
                />
                <UserOutlined className="text-zinc-400" />
                <div className="flex-1">
                  <div className="font-medium">{user.name || user.email}</div>
                  <div className="text-xs text-zinc-500">{user.email} • {user.role}</div>
                </div>
                {user.userGroup === selectedGroup?.id && (
                  <Tag color="green">{t('groups.currentMember') || 'Member'}</Tag>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => {
              setIsAssignModalOpen(false);
              setSelectedGroup(null);
              setSelectedUsers([]);
            }} className="rounded-lg h-10">{t('common.cancel')}</Button>
            <Button
              type="primary"
              onClick={handleAssignUsers}
              disabled={selectedUsers.length === 0}
              className="rounded-lg h-10 bg-zinc-900"
            >
              {t('groups.assign') || 'Assign'} ({selectedUsers.length})
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}