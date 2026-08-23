'use client';

import { useState, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Eye } from 'lucide-react';
import { ProCard } from '@/components/ui/ProCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import { cn } from '@/lib/ui';
import { DURATION, EASE_STANDARD } from '@/components/ui/motion';
import { useI18n } from '@/hooks/use-i18n';
import { decryptArticle, type ArticleCryptoPayload } from '@/lib/article-crypto';

interface ArticleEncryptionProps {
  /** 密文参数（构建时识别，仅下发密文不下发明文） */
  encryptedPayload: ArticleCryptoPayload | null;
  /** 验证并解密成功后调用，传入明文 Markdown 内容 */
  onDecrypted: (content: string) => void;
  className?: string;
}

/**
 * 文章加密密码验证组件
 * - 居中卡片布局，锁图标 + 密码输入框
 * - PBKDF2 + AES-GCM 解密正文：密码正确性由 GCM 认证标签判定，
 *   不再随页面下发独立的快速哈希（避免离线爆破旁路架空 PBKDF2 迭代成本）
 * - AnimatePresence 过渡动画
 * 注意：密码校验与解密完全在客户端进行，适用于静态站点场景；
 * 站点只下发密文，密钥由密码派生，无后门。
 */
export function ArticleEncryption({
  encryptedPayload,
  onDecrypted,
  className,
}: ArticleEncryptionProps) {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const [errorKind, setErrorKind] = useState<'wrong-password' | 'no-cipher' | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [stage, setStage] = useState<'input' | 'success'>('input');

  const handleVerify = useCallback(async () => {
    if (!inputValue.trim()) return;
    // 无密文参数（旧格式遗留：frontmatter 有 password 但正文未加密）时无法解密，必须明确报错
    if (!encryptedPayload) {
      setErrorKind('no-cipher');
      return;
    }

    setVerifying(true);
    setErrorKind(null);

    try {
      // 直接尝试解密：AES-GCM 认证标签校验失败即密码错误，
      // 错误尝试需承担完整 PBKDF2 迭代成本（这正是设计意图）
      const plain = await decryptArticle(inputValue.trim(), encryptedPayload);
      setStage('success');
      // 动画完成后回调
      setTimeout(() => {
        onDecrypted(plain);
      }, 600);
    } catch {
      // 密码错误、Web Crypto API 不可用或密文损坏时明确报错，不静默通过
      setErrorKind('wrong-password');
    } finally {
      setVerifying(false);
    }
  }, [inputValue, encryptedPayload, onDecrypted]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleVerify();
      }
    },
    [handleVerify],
  );

  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <AnimatePresence mode="wait">
        {stage === 'input' ? (
          <motion.div
            key="encryption-gate"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: DURATION.SLOW, ease: EASE_STANDARD }}
          >
            <ProCard className="w-full max-w-md shadow-lg">
              <div className="flex flex-col items-center gap-6 py-4">
                {/* 锁图标 */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center"
                >
                  <Lock size={28} className="text-zinc-500 dark:text-zinc-400" />
                </motion.div>

                {/* 标题 */}
                <div className="text-center">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {t('components.articleEncryption.encryptedTitle')}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('components.articleEncryption.enterPasswordHint')}
                  </p>
                </div>

                {/* 密码输入框 */}
                <div className="w-full">
                  <Input
                    type="password"
                    placeholder={t('components.articleEncryption.passwordPlaceholder')}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setErrorKind(null);
                    }}
                    onKeyDown={handleKeyDown}
                    size="lg"
                    rounded="lg"
                    ring="strong"
                    error={errorKind ? t('components.articleEncryption.passwordError') : undefined}
                    autoFocus
                  />
                </div>

                {/* 错误提示 */}
                <AnimatePresence>
                  {errorKind && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: DURATION.MID }}
                    >
                      <Tag variant="danger" size="sm">
                        {errorKind === 'no-cipher'
                          ? t('components.articleEncryption.legacyFormatError')
                          : t('components.articleEncryption.passwordError')}
                      </Tag>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 确认按钮 */}
                <Button
                  variant="primary"
                  size="lg"
                  block
                  loading={verifying}
                  disabled={!inputValue.trim()}
                  onClick={handleVerify}
                  icon={verifying ? undefined : <Unlock size={16} />}
                >
                  {verifying ? t('components.articleEncryption.verifying') : t('common.confirm')}
                </Button>
              </div>
            </ProCard>
          </motion.div>
        ) : (
          <motion.div
            key="decryption-success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION.SLOW, ease: EASE_STANDARD }}
            className="flex flex-col items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
            >
              <Eye size={22} className="text-emerald-600 dark:text-emerald-400" />
            </motion.div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t('components.articleEncryption.successLoading')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ArticleEncryption.displayName = 'ArticleEncryption';
export default ArticleEncryption;
