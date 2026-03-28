'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useI18n } from '@/hooks/use-i18n';
import {
  createUserGroup,
  getAllUserGroups,
  getAllUsers,
  type UserGroup,
  type UserProfile
} from '@/lib/user';
import { Button, Input, Card, Table, Modal, Form, Select, message, Tag, Space } from 'antd';
import { PlusOutlined, UsergroupAddOutlined } from '@ant-design/icons';
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
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
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
      key: 'description'
    },
    {
      title: t('groups.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
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
    </div>
  );
}