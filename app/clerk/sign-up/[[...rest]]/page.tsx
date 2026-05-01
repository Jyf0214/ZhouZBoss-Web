'use client';

import { SignUp } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';

/**
 * Clerk 注册页面
 */
export default function ClerkSignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <SignUp
          routing="path"
          path="/clerk/sign-up"
          signInUrl="/clerk/sign-in"
          fallbackRedirectUrl="/clerk/after-auth"
        />
      </main>
    </div>
  );
}