'use client';

import { SignIn } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';

/**
 * Clerk 登录页面
 */
export default function ClerkSignInPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <SignIn
          routing="path"
          path="/clerk/sign-in"
          signUpUrl="/clerk/sign-up"
          fallbackRedirectUrl="/clerk/after-auth"
        />
      </main>
    </div>
  );
}