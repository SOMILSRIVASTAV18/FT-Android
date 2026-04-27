import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signInWithCredential, GoogleAuthProvider } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { Fingerprint } from 'lucide-react';
import { Logo } from './Logo';
import { NativeService } from '../lib/native';
import { motion } from 'motion/react';

// Initialize Google Auth for native
if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize();
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
        // For mobile browsers, redirect is more reliable than popup
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          await signInWithRedirect(auth, googleProvider);
        } else {
          await signInWithPopup(auth, googleProvider);
        }
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      let message = 'Failed to login with Google';
      if (error.message?.includes('popup_closed_by_user')) {
        message = 'Login cancelled';
      } else if (error.message?.includes('network-request-failed')) {
        message = 'Network error. Please check your connection.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (error: any) {
      console.error(error);
      let message = error.message || 'Authentication failed';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background p-4 overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] animate-pulse delay-1000" />

      <Card className="w-full max-w-md border-none glass relative z-10 shadow-2xl rounded-[40px] overflow-hidden">
        <CardHeader className="space-y-2 pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative"
            >
              <Logo size="xl" />
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-background border-4 border-background rounded-full flex items-center justify-center shadow-lg">
                <span className="text-primary font-black text-xs">PRO</span>
              </div>
            </motion.div>
          </div>
          <CardTitle className="text-4xl font-black text-center tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">FinTrack Pro</CardTitle>
          <CardDescription className="text-center font-bold text-muted-foreground/80">
            {isLogin ? 'Welcome back to your financial hub' : 'Start your journey to financial freedom'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8">
          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" onClick={handleGoogleLogin} className="w-full h-14 font-black rounded-2xl border-2 hover:bg-accent transition-all active:scale-95">
              <LogIn className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
              <span className="bg-transparent px-4 text-muted-foreground">Or email access</span>
            </div>
          </div>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-2 text-muted-foreground">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                className="h-14 rounded-2xl border-2 focus-visible:ring-primary bg-background/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</Label>
                {isLogin && (
                  <Button 
                    variant="link" 
                    className="px-0 h-auto font-black text-[10px] uppercase tracking-widest text-primary" 
                    type="button"
                    onClick={handleForgotPassword}
                  >
                    Forgot?
                  </Button>
                )}
              </div>
              <Input 
                id="password" 
                type="password" 
                className="h-14 rounded-2xl border-2 focus-visible:ring-primary bg-background/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <Button type="submit" className="w-full h-14 font-black rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 mt-4" disabled={loading}>
              {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            variant="ghost" 
            className="w-full text-xs font-bold hover:bg-transparent hover:text-primary" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
