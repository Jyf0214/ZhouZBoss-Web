/**
 * /admin/storage 页面 fetch 封装
 *
 * - 统一错误格式(ApiError),便于上层走 showError
 * - 自动检测 503 + code=NOT_CONFIGURED,抛出专属错误
 * - 所有方法返回已解析的 JSON,网络/HTTP 失败抛 ApiError
 */
import type { StorageFolderMeta, WebDavEntry } from '@/lib/storage/types';
import type { StorageConfig, UpdateFolderPayload } from './types';

/** 统一 API 错误 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** 判定当前错误是否表示 WebDAV 未配置 */
  public get isNotConfigured(): boolean {
    return this.status === 503 && (this.code === 'NOT_CONFIGURED' || this.code === 'DB_NOT_CONFIGURED');
  }

  /** 判定当前错误是否表示数据库未配置 */
  public get isDbNotConfigured(): boolean {
    return this.status === 503 && this.code === 'DB_NOT_CONFIGURED';
  }
}

/** 通用 fetch 包装,统一错误处理 */
async function request<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '网络请求失败';
    throw new ApiError(msg, 0);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const data = body as { error?: string; code?: string } | null;
    const message = data?.error ?? `请求失败 (${res.status})`;
    throw new ApiError(message, res.status, data?.code ?? null);
  }

  return body as T;
}

/** 编码 URL 中需要拼接的 path(每段单独 encode) */
function encodePathSegments(path: string): string {
  if (!path) return '';
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/* === API 调用 === */

export function fetchConfig(): Promise<StorageConfig> {
  return request<StorageConfig>('/api/storage/config');
}

export async function fetchFolders(): Promise<StorageFolderMeta[]> {
  const res = await request<{ folders: StorageFolderMeta[] }>('/api/storage/folders');
  return Array.isArray(res?.folders) ? res.folders : [];
}

export function fetchFolderMeta(path: string): Promise<StorageFolderMeta> {
  return request<StorageFolderMeta>(
    `/api/storage/folder/${encodePathSegments(path)}`
  );
}

export function patchFolderMeta(
  path: string,
  body: UpdateFolderPayload
): Promise<StorageFolderMeta> {
  return request<StorageFolderMeta>(
    `/api/storage/folder/${encodePathSegments(path)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

export function fetchEntries(path: string): Promise<{ entries: WebDavEntry[] }> {
  const suffix = encodePathSegments(path);
  return request<{ entries: WebDavEntry[] }>(
    suffix ? `/api/storage/list/${suffix}` : '/api/storage/list'
  );
}

export function uploadFile(
  path: string,
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<{ path: string; size: number; uploadedAt: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/storage/upload/${encodePathSegments(path)}`);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status === 204) {
        resolve({ path: '', size: 0, uploadedAt: '' });
        return;
      }
      let body: { path?: string; size?: number; uploadedAt?: string; error?: string; code?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          path: body?.path ?? '',
          size: body?.size ?? 0,
          uploadedAt: body?.uploadedAt ?? '',
        });
      } else {
        const message = body?.error ?? `上传失败 (${xhr.status})`;
        reject(new ApiError(message, xhr.status, body?.code ?? null));
      }
    };
    xhr.onerror = () => {
      reject(new ApiError('网络错误,上传失败', 0));
    };
    xhr.send(file);
  });
}

export function deleteFile(path: string): Promise<void> {
  return request<void>(`/api/storage/file/${encodePathSegments(path)}`, {
    method: 'DELETE',
  });
}

export function mkdir(path: string): Promise<StorageFolderMeta> {
  return request<StorageFolderMeta>(
    `/api/storage/mkdir/${encodePathSegments(path)}`,
    { method: 'POST' }
  );
}

export function rmdir(path: string): Promise<void> {
  return request<void>(`/api/storage/rmdir/${encodePathSegments(path)}`, {
    method: 'DELETE',
  });
}

export function renameFolder(
  path: string,
  newName: string
): Promise<StorageFolderMeta> {
  return request<StorageFolderMeta>(
    `/api/storage/rename/${encodePathSegments(path)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName }),
    }
  );
}

export function moveFile(
  path: string,
  destination: string
): Promise<{ path: string }> {
  return request<{ path: string }>(
    `/api/storage/move/${encodePathSegments(path)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination }),
    }
  );
}
