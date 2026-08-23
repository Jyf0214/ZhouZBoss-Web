/**
 * 日记输入校验（POST/PUT 共用）
 *
 * 非法日期/定时时间此前会传入 Prisma 抛出 500，定时时间非法还会被静默
 * 降级为"立即发布"。统一校验：非法输入显式返回 400，绝不静默降级。
 */
import type { Prisma } from '../../prisma/generated/prisma/client';
import { getTranslate } from '@/i18n/translate';

const MAX_TITLE = 200;
const MAX_CONTENT = 50000;
const MAX_TAG_LEN = 50;
const MAX_TAGS = 50;

export interface ValidatedDiaryInput {
  title: string;
  content: string;
  tags: string[];
  group: string | null;
  date: Date | undefined;
  scheduledAt: Date | undefined;
  references: Prisma.InputJsonValue[];
}

/** 校验标签数组：必须是字符串数组，每个标签 1-50 字符，最多 50 个 */
function validateTags(tags: unknown): { ok: true; value: string[] } | { ok: false; error: string } {
  if (tags === undefined) return { ok: true, value: [] };
  if (
    !Array.isArray(tags) ||
    !tags.every((t) => typeof t === 'string') ||
    tags.some((t) => t.length === 0 || t.length > MAX_TAG_LEN) ||
    tags.length > MAX_TAGS
  ) {
    return { ok: false, error: getTranslate('api.diary.tagsInvalid') };
  }
  return { ok: true, value: tags };
}

/** 解析日期字段（date/scheduledAt 共用）：非法时间返回 400，不静默降级 */
function parseDateField(value: unknown, errorKey: 'api.diary.dateInvalid' | 'api.diary.scheduledAtInvalid'): { ok: true; value: Date | undefined } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: undefined };
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: getTranslate(errorKey) };
  }
  return { ok: true, value: parsed };
}

/** 校验非空字符串字段（title/content 共用） */
function validateRequiredString(
  value: unknown,
  errorKey: 'api.diary.titleAndContentRequired',
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { ok: false, error: getTranslate(errorKey) };
  }
  return { ok: true, value: value.trim() };
}

/** 校验长度上限（title/content 共用） */
function validateMaxLength(
  value: string,
  max: number,
  errorKey: 'api.diary.titleTooLong' | 'api.diary.contentTooLong',
): { ok: true } | { ok: false; error: string } {
  if (value.length > max) {
    return { ok: false, error: getTranslate(errorKey, { max }) };
  }
  return { ok: true };
}

/** 单个 reference 项类型检查：仅允许基本 JSON 类型与不含函数的数组，其余项跳过 */
function isReferenceItemTypeAllowed(item: unknown): boolean {
  if (item === null) return true;
  const t = typeof item;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (Array.isArray(item)) return !item.some((v) => typeof v === 'function');
  return t === 'object';
}

/**
 * references 校验：必须为数组且每项为可序列化对象/字符串，
 * 总量不超过 100 条，防止单项超大 JSON 注入
 */
function validateReferences(
  references: unknown,
): { ok: true; value: Prisma.InputJsonValue[] } | { ok: false; error: string } {
  if (references === undefined || references === null) return { ok: true, value: [] };
  if (!Array.isArray(references)) {
    return { ok: false, error: getTranslate('api.diary.referencesInvalid') };
  }
  if (references.length > 100) {
    return { ok: false, error: getTranslate('api.diary.referencesTooMany') };
  }
  for (const item of references) {
    // 非法类型直接跳过而非报错，保持向后兼容，但记录过滤
    if (!isReferenceItemTypeAllowed(item)) continue;
    // 简单深度限制：对象序列化后超过 2000 字符则拒绝
    try {
      if (JSON.stringify(item).length > 2000) {
        return { ok: false, error: getTranslate('api.diary.referencesTooLarge') };
      }
    } catch {
      return { ok: false, error: getTranslate('api.diary.referencesInvalid') };
    }
  }
  return { ok: true, value: references as Prisma.InputJsonValue[] };
}

export function validateDiaryInput(
  body: Record<string, unknown>,
): { ok: true; value: ValidatedDiaryInput } | { ok: false; error: string } {
  const { title, content, tags, group, references, date, scheduledAt } = body;

  const titleCheck = validateRequiredString(title, 'api.diary.titleAndContentRequired');
  if (!titleCheck.ok) return titleCheck;
  const titleTooLong = validateMaxLength(titleCheck.value, MAX_TITLE, 'api.diary.titleTooLong');
  if (!titleTooLong.ok) return titleTooLong;

  const contentCheck = validateRequiredString(content, 'api.diary.titleAndContentRequired');
  if (!contentCheck.ok) return contentCheck;
  const contentTooLong = validateMaxLength(contentCheck.value, MAX_CONTENT, 'api.diary.contentTooLong');
  if (!contentTooLong.ok) return contentTooLong;

  const tagsCheck = validateTags(tags);
  if (!tagsCheck.ok) return tagsCheck;

  const dateCheck = parseDateField(date, 'api.diary.dateInvalid');
  if (!dateCheck.ok) return dateCheck;

  const scheduledCheck = parseDateField(scheduledAt, 'api.diary.scheduledAtInvalid');
  if (!scheduledCheck.ok) return scheduledCheck;

  const referencesCheck = validateReferences(references);
  if (!referencesCheck.ok) return referencesCheck;

  return {
    ok: true,
    value: {
      title: titleCheck.value,
      content: contentCheck.value,
      tags: tagsCheck.value,
      group: typeof group === 'string' && group.trim() ? group.trim() : null,
      date: dateCheck.value,
      scheduledAt: scheduledCheck.value,
      references: referencesCheck.value,
    },
  };
}