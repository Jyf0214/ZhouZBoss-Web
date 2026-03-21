/**
 * User Identity System - UID Management (Client-Side Wrapper)
 * Originium Kernel - Pure Client Logic
 */

export type UserRole = 'user' | 'admin' | 'sudo';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  userGroup?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'pending_deletion' | 'deleted';
  deletionRequestedAt?: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  memberCount: number;
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const res = await fetch(`/api/users/${uid}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Update user role (sudo only)
 */
export async function updateUserRole(
  uid: string, 
  newRole: UserRole,
  userGroup?: string
): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole, userGroup }),
  });
  if (!res.ok) throw new Error('Failed to update role');
}

/**
 * Get all users (sudo only)
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/users');
  if (!res.ok) return [];
  return res.json();
}

/**
 * Create user group (sudo only)
 */
export async function createUserGroup(
  name: string,
  description: string,
  createdBy: string
): Promise<UserGroup> {
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, createdBy }),
  });
  if (!res.ok) throw new Error('Failed to create group');
  return res.json();
}

/**
 * Get all user groups
 */
export async function getAllUserGroups(): Promise<UserGroup[]> {
  const res = await fetch('/api/groups');
  if (!res.ok) return [];
  return res.json();
}

/**
 * Assign user to group (sudo only)
 */
export async function assignUserToGroup(
  uid: string,
  groupId: string
): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userGroup: groupId }),
  });
  if (!res.ok) throw new Error('Failed to assign group');
}
