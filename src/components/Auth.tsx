import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signInWithCredential, GoogleAuthProvider } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Lock, Mail, CheckCircle2, Shield, Sparkles, QrCode } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { Logo } from './Logo';
import { motion } from 'motion/react';

// Initialize Google Auth for native
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
}

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const user = await GoogleAuth.signIn();
        if (!user.authentication.idToken) {
          throw new Error('No ID token received from Google');
        }
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          await signInWithRedirect(auth, googleProvider);
        } else {
          await signInWithPopup(auth, googleProvider);
        }
      }
    } catch (error: any) {
      const errCode = error?.code || '';
      const errMsg = error?.message || '';
      if (
        errCode === 'auth/popup-closed-by-user' ||
        errCode === 'auth/cancelled-popup-request' ||
        errMsg.includes('popup-closed-by-user') ||
        errMsg.includes('cancelled-popup-request') ||
        errMsg.includes('popup_closed_by_user')
      ) {
        toast.info('Google sign-in cancelled');
        return;
      }

      console.error('Google Login Error:', error);
      let message = 'Failed to login with Google';
      if (errMsg.includes('network-request-failed') || errCode === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      } else if (errMsg.includes('unauthorized-domain') || errCode === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized in Firebase Auth settings.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }
    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await sendEmailVerification(userCredential.user);
          toast.success('Account created! A verification link has been sent to your email.');
        } catch (verErr: any) {
          console.warn('Failed to send initial verification email:', verErr);
          toast.success('Account created successfully!');
        }
      }
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      const code = error?.code || '';
      let message = error.message || 'Authentication failed';
      if (code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please sign in instead.';
      } else if (code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please verify and try again.';
      } else if (code === 'auth/too-many-requests') {
        message = 'Access temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.';
      } else if (code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection.';
      } else if (code === 'auth/operation-not-allowed') {
        message = 'Email/password sign-in is not enabled in Firebase Auth.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      toast.success('Password reset link sent to your email!');
    } catch (error: any) {
      const code = error?.code || '';
      let msg = error?.message || 'Failed to send reset email';
      if (code === 'auth/user-not-found') {
        msg = 'No user found with this email address.';
      } else if (code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      toast.error(msg);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-10 relative selection:bg-primary/20">
      {/* Subtle ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl bg-card border border-border/80 shadow-2xl rounded-3xl md:rounded-[32px] overflow-hidden relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12">
          
          {/* DESKTOP SHOWCASE (Modern, Simple, Uncluttered) */}
          <div className="hidden md:flex md:col-span-6 lg:col-span-6 flex-col justify-between p-10 lg:p-12 bg-muted/30 border-r border-border/60 relative">
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3 mb-10">
                <Logo size="md" />
                <div>
                  <span className="font-extrabold tracking-tight text-lg text-foreground">FinTrack Pro</span>
                  <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">v2.4</span>
                </div>
              </div>

              {/* Title & Tagline */}
              <div className="space-y-3 mb-8">
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  Intelligent finance. <br />
                  <span className="text-muted-foreground font-normal">Effortless daily control.</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Personal expense tracking, dynamic UPI QR payments, and real-time cloud synchronization in one seamless hub.
                </p>
              </div>

              {/* Clean Feature List */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/85">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span>Personal UPI QR code generation & scanning</span>
                </div>

                <div className="flex items-center gap-3 text-sm font-medium text-foreground/85">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>Expense tracking, passbook & budgets</span>
                </div>

                <div className="flex items-center gap-3 text-sm font-medium text-foreground/85">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span>Real-time cloud backup & device sync</span>
                </div>
              </div>
            </div>

            {/* Bottom Minimalist Note */}
            <div className="pt-8 flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Secure, fast, and encrypted</span>
            </div>
          </div>

          {/* AUTHENTICATION FORM */}
          <div className="col-span-12 md:col-span-6 lg:col-span-6 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
            <div className="space-y-6">
              
              {/* Header */}
              <div className="text-center md:text-left">
                <div className="flex justify-center md:hidden mb-5">
                  <Logo size="lg" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {isLogin ? 'Welcome back' : 'Create an account'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {isLogin ? 'Enter your details to access your account' : 'Sign up to start tracking your finances today'}
                </p>
              </div>

              {/* Google Button */}
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleGoogleLogin} 
                className="w-full h-11 sm:h-12 font-semibold rounded-xl border border-border hover:bg-muted/50 transition-all flex items-center justify-center gap-3 text-sm shadow-xs"
                disabled={loading}
              >
                <GoogleIcon className="w-4 h-4 shrink-0" />
                <span>Continue with Google</span>
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-0.5">
                <div className="h-px bg-border/70 flex-1" />
                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Or continue with email
                </span>
                <div className="h-px bg-border/70 flex-1" />
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground block">
                    Email address
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="h-11 rounded-xl border border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                      Password
                    </Label>
                    {isLogin && (
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    className="h-11 rounded-xl border border-border bg-background focus-visible:ring-2 focus-visible:ring-primary/20 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold rounded-xl transition-all active:scale-[0.99] text-sm mt-2 flex items-center justify-center gap-2" 
                  disabled={loading}
                >
                  <span>{loading ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Button>
              </form>

              {/* Bottom Toggle */}
              <div className="text-center pt-1">
                <p className="text-xs text-muted-foreground">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="font-semibold text-primary hover:underline ml-1"
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


