/**
 * TOTP 双因素认证工具函数
 * 基于 otplib v13，在服务端（API route）中使用
 */
import { OTP } from 'otplib';

/** TOTP 应用名称，显示在验证器 App 中 */
const APP_NAME = 'OriginiumKernel';

/** OTP 实例，使用 TOTP 策略 */
const otp = new OTP({ strategy: 'totp' });

/**
 * 生成 TOTP 密钥（随机 base32 字符串）
 */
export function generateTotpSecret(): string {
  return otp.generateSecret();
}

/**
 * 生成 otpauth:// URI（用于 QR 码扫描）
 */
export function generateTotpUri(secret: string, email: string): string {
  return otp.generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

/**
 * 验证 TOTP 码
 * @param token 用户输入的 6 位验证码
 * @param secret 用户的 TOTP 密钥
 * @returns 是否验证通过
 */
export function verifyTotp(token: string, secret: string): boolean {
  // 验证前清理输入：去除空格、破折号等非数字字符
  const cleanToken = token.replace(/[\s\-]/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }
  const result = otp.verifySync({ token: cleanToken, secret });
  return result.valid;
}
