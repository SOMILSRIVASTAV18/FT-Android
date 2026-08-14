import React, { useState, useEffect } from 'react';
import { UserProfile, Family } from '../types';
import { db, collection, addDoc, updateDoc, doc, query, where, onSnapshot, getDocs, handleFirestoreError, OperationType, Timestamp, deleteDoc, writeBatch, auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, UserPlus, Shield, LogOut, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FamilyRequest, AppNotification, Transaction } from '../types';
import { NativeService } from '../lib/native';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Download, PieChart as PieChartIcon, FileText, Table as TableIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FamilyViewProps {
  profile: UserProfile;
  family: Family | null;
  transactions: Transaction[];
}

const COLORS = [
  'oklch(0.6 0.2 260)', 
  'oklch(0.6 0.2 160)', 
  'oklch(0.6 0.2 60)', 
  'oklch(0.6 0.2 300)', 
  'oklch(0.6 0.2 200)', 
  'oklch(0.6 0.2 100)', 
  'oklch(0.6 0.2 20)'
];

export function FamilyView({ profile, family, transactions }: FamilyViewProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FamilyRequest[]>([]);
  const [myRequest, setMyRequest] = useState<FamilyRequest | null>(null);

  // PDF Export state and filters
  const [isPdfExportOpen, setIsPdfExportOpen] = useState(false);
  const [pdfDuration, setPdfDuration] = useState<'10days' | '15days' | '1month' | '1year' | 'custom' | 'all'>('all');
  const [pdfStartDate, setPdfStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pdfEndDate, setPdfEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!family) {
      // Listen for my pending requests
      const q = query(
        collection(db, 'familyRequests'), 
        where('userId', '==', profile.uid),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setMyRequest({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FamilyRequest);
        } else {
          setMyRequest(null);
        }
      });
      return () => unsubscribe();
    }

    // If owner, listen for pending requests to join
    if (family.ownerId === profile.uid) {
      const q = query(
        collection(db, 'familyRequests'),
        where('familyId', '==', family.id),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyRequest)));
      });
      return () => unsubscribe();
    }
  }, [family, profile.uid]);

  useEffect(() => {
    if (!family) return;

    const q = query(collection(db, 'users'), where('familyId', '==', family.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'users (family members)');
      }
    });

    return () => unsubscribe();
  }, [family]);

  const handleCreateFamily = async () => {
    if (!familyName) return;
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const familyRef = await addDoc(collection(db, 'families'), {
        name: familyName,
        code,
        ownerId: profile.uid,
        members: [profile.uid]
      });

      await updateDoc(doc(db, 'users', profile.uid), {
        familyId: familyRef.id
      });

      toast.success(`Family "${familyName}" created! Code: ${code}`);
      setIsCreating(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'families (create)');
      toast.error('Failed to create family');
    }
  };

  const handleJoinFamily = async () => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a family code');
      return;
    }
    try {
      const q = query(collection(db, 'families'), where('code', '==', cleanCode));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error('Invalid family code');
        return;
      }

      const familyDoc = snapshot.docs[0];
      const familyData = familyDoc.data() as Family;

      if (familyData.members && familyData.members.includes(profile.uid)) {
        toast.error('You are already a member of this family');
        return;
      }

      // Check if request already exists
      const reqQ = query(
        collection(db, 'familyRequests'),
        where('familyId', '==', familyDoc.id),
        where('userId', '==', profile.uid),
        where('status', '==', 'pending')
      );
      const reqSnapshot = await getDocs(reqQ);
      if (!reqSnapshot.empty) {
        toast.error('Request already pending approval');
        return;
      }

      await addDoc(collection(db, 'familyRequests'), {
        familyId: familyDoc.id,
        userId: profile.uid,
        userName: profile?.displayName || profile?.email?.split('@')[0] || 'User',
        userEmail: profile?.email || 'user@example.com',
        status: 'pending',
        createdAt: Timestamp.now()
      });

      // Notify family owner
      if (familyData.ownerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: familyData.ownerId,
          title: 'New Family Request',
          message: `${profile?.displayName || profile?.email || 'A user'} wants to join your family group.`,
          type: 'info',
          read: false,
          createdAt: Timestamp.now()
        });
      }

      toast.success('Join request sent to family owner!');
      setJoinCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'familyRequests (create)');
      toast.error('Failed to send join request');
    }
  };

  const handleWithdrawRequest = async () => {
    if (!myRequest) return;
    try {
      await deleteDoc(doc(db, 'familyRequests', myRequest.id));
      toast.success('Request withdrawn');
    } catch (error) {
      toast.error('Failed to withdraw request');
    }
  };

  const handleApproveRequest = async (request: FamilyRequest) => {
    if (!family) return;
    try {
      const batch = writeBatch(db);

      // 1. Update family members
      const currentMembers = Array.isArray(family.members) ? family.members : [];
      const updatedMembers = currentMembers.includes(request.userId) ? currentMembers : [...currentMembers, request.userId];
      const familyRef = doc(db, 'families', family.id);
      batch.update(familyRef, {
        members: updatedMembers
      });

      // 2. Update user profile
      const userRef = doc(db, 'users', request.userId);
      batch.update(userRef, {
        familyId: family.id
      });

      // 3. Update request status
      const requestRef = doc(db, 'familyRequests', request.id);
      batch.update(requestRef, {
        status: 'approved'
      });

      // 4. Create notification for the user
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        userId: request.userId,
        title: 'Family Request Approved',
        message: `Your request to join "${family.name}" has been approved!`,
        type: 'success',
        read: false,
        createdAt: Timestamp.now()
      });

      await batch.commit();

      toast.success('Member approved!');
      NativeService.sendLocalNotification('New Member', `${request.userName || request.userEmail} joined your family!`);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve member');
    }
  };

  const handleRejectRequest = async (request: FamilyRequest) => {
    try {
      await updateDoc(doc(db, 'familyRequests', request.id), {
        status: 'rejected'
      });
      // 2. Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        title: 'Family Request Rejected',
        message: `Your request to join "${family.name}" was rejected.`,
        type: 'error',
        read: false,
        createdAt: Timestamp.now()
      });

      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const handleLeaveFamily = async () => {
    if (!family) return;

    try {
      const newMembers = family.members.filter(id => id !== profile.uid);
      
      if (newMembers.length === 0) {
        // Delete family if no members left (optional logic)
      } else {
        await updateDoc(doc(db, 'families', family.id), {
          members: newMembers
        });
      }

      await updateDoc(doc(db, 'users', profile.uid), {
        familyId: null
      });

      toast.success('Left family');
    } catch (error) {
      toast.error('Failed to leave family');
    }
  };

  const categorySummary = React.useMemo(() => {
    if (!family) return [];
    const familyTxs = transactions.filter(tx => tx.familyId === family.id || tx.isFamily);
    const summary = familyTxs
      .filter(tx => tx.type === 'expense')
      .reduce((acc: any[], tx) => {
        const existing = acc.find(a => a.name === tx.category);
        if (existing) {
          existing.value += tx.amount;
        } else {
          acc.push({ name: tx.category, value: tx.amount });
        }
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value);
    return summary;
  }, [transactions, family]);

  const detailedSummary = React.useMemo(() => {
    if (!family || members.length === 0) return null;
    
    const familyTxs = transactions.filter(tx => (tx.familyId === family.id || tx.isFamily) && tx.type === 'expense');
    const categories = Array.from(new Set(familyTxs.map(tx => tx.category))).sort();
    
    const memberMatrix = members.map(member => {
      const memberTxs = familyTxs.filter(tx => tx.userId === member.uid);
      const spendings: Record<string, number> = {};
      let total = 0;
      
      categories.forEach(cat => {
        const catTotal = memberTxs.filter(tx => tx.category === cat).reduce((acc, tx) => acc + tx.amount, 0);
        spendings[cat] = catTotal;
        total += catTotal;
      });
      
      return {
        uid: member.uid,
        name: member.displayName || member.email,
        spendings,
        total
      };
    });

    const categoryTotals: Record<string, number> = {};
    let grandTotal = 0;
    categories.forEach(cat => {
      const total = memberMatrix.reduce((acc, m) => acc + m.spendings[cat], 0);
      categoryTotals[cat] = total;
      grandTotal += total;
    });

    return { categories, memberMatrix, categoryTotals, grandTotal };
  }, [transactions, family, members]);

  const generatePDF = async () => {
    if (!family) return;
    try {
      const doc = new jsPDF();
      const dateStr = format(new Date(), 'dd MMM yyyy');
      const isAdmin = family.ownerId === profile.uid;

      // Filter family transactions based on chosen duration
      const filteredFamilyTxs = transactions.filter(tx => {
        const isFam = tx.familyId === family.id || tx.isFamily;
        if (!isFam) return false;

        const txDate = tx.date.toDate();
        const now = new Date();
        if (pdfDuration === '10days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 10);
          return txDate >= limit;
        }
        if (pdfDuration === '15days') {
          const limit = new Date();
          limit.setDate(now.getDate() - 15);
          return txDate >= limit;
        }
        if (pdfDuration === '1month') {
          const limit = new Date();
          limit.setMonth(now.getMonth() - 1);
          return txDate >= limit;
        }
        if (pdfDuration === '1year') {
          const limit = new Date();
          limit.setFullYear(now.getFullYear() - 1);
          return txDate >= limit;
        }
        if (pdfDuration === 'custom' && pdfStartDate && pdfEndDate) {
          const start = new Date(pdfStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(pdfEndDate);
          end.setHours(23, 59, 59, 999);
          return txDate >= start && txDate <= end;
        }
        return true;
      });

      if (filteredFamilyTxs.length === 0) {
        toast.info('No family transactions found for the selected duration.');
        return;
      }

      // Compute dynamic detailedSummary for the PDF
      const expenseTxs = filteredFamilyTxs.filter(tx => tx.type === 'expense');
      const categories = Array.from(new Set(expenseTxs.map(tx => tx.category))).sort();
      
      const memberMatrix = members.map(member => {
        const memberTxs = expenseTxs.filter(tx => tx.userId === member.uid);
        const spendings: Record<string, number> = {};
        let total = 0;
        
        categories.forEach(cat => {
          const catTotal = memberTxs.filter(tx => tx.category === cat).reduce((acc, tx) => acc + tx.amount, 0);
          spendings[cat] = catTotal;
          total += catTotal;
        });
        
        return {
          uid: member.uid,
          name: member.displayName || member.email,
          spendings,
          total
        };
      });

      const categoryTotals: Record<string, number> = {};
      let grandTotal = 0;
      categories.forEach(cat => {
        const total = memberMatrix.reduce((acc, m) => acc + m.spendings[cat], 0);
        categoryTotals[cat] = total;
        grandTotal += total;
      });

      const pdfSummary = { categories, memberMatrix, categoryTotals, grandTotal };

      doc.setFontSize(22);
      doc.setTextColor(139, 92, 246);
      doc.text(`${family.name} - Family Report`, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${dateStr}`, 14, 30);

      let rangeText = "";
      if (pdfDuration !== 'all') {
        if (pdfDuration === 'custom') {
          rangeText = `Range: ${format(new Date(pdfStartDate), 'dd MMM yyyy')} to ${format(new Date(pdfEndDate), 'dd MMM yyyy')}`;
        } else {
          rangeText = `Duration: Last ${pdfDuration === '10days' ? '10 Days' : pdfDuration === '15days' ? '15 Days' : pdfDuration === '1month' ? '1 Month' : '1 Year'}`;
        }
        doc.text(rangeText, 14, 35);
      }

      // Member Category Summaries
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Member Category Summaries', 14, rangeText ? 48 : 45);

      let currentY = rangeText ? 53 : 50;
      pdfSummary.memberMatrix.forEach(m => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${m.name} - Total: ${profile.settings.currency}${m.total.toFixed(2)}`, 14, currentY);
        currentY += 7;

        const memberBody = pdfSummary.categories
          .filter(cat => m.spendings[cat] > 0)
          .map(cat => [cat, `${profile.settings.currency}${m.spendings[cat].toFixed(2)}`]);

        if (memberBody.length > 0) {
          autoTable(doc, {
            startY: currentY,
            head: [['Category', 'Amount']],
            body: memberBody,
            headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 20 },
            theme: 'striped'
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('No expenses recorded', 20, currentY);
          currentY += 10;
        }
      });

      // Overall Summary
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Overall Family Summary', 14, 22);
      
      const overallBody = pdfSummary.categories.map(cat => [
        cat,
        `${profile.settings.currency}${pdfSummary.categoryTotals[cat].toFixed(2)}`
      ]);
      overallBody.push(['TOTAL', `${profile.settings.currency}${pdfSummary.grandTotal.toFixed(2)}`]);

      autoTable(doc, {
        startY: 30,
        head: [['Category', 'Total Amount']],
        body: overallBody,
        headStyles: { fillColor: [139, 92, 246] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      });

      // Transaction Details (Admin Only)
      if (isAdmin) {
        const familyTxs = filteredFamilyTxs;
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Detailed Transaction History (Admin Only)', 14, 22);
        
        const detailedTableData = familyTxs.map(tx => [
          format(tx.date.toDate(), 'dd/MM/yyyy'),
          tx.description,
          tx.category,
          tx.type.toUpperCase(),
          `${profile.settings.currency} ${tx.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
          startY: 30,
          head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
          body: detailedTableData,
          headStyles: { fillColor: [139, 92, 246] },
        });
      }

      if (Capacitor.getPlatform() !== 'web') {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const fileName = `${family.name}_Family_Report.pdf`;
        
        try {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: pdfBase64,
            directory: Directory.Cache,
          });

          await Share.share({
            title: 'Family Activity Report',
            text: `Financial report for ${family.name}`,
            url: savedFile.uri,
            dialogTitle: 'Share or Save Report',
          });
          
          toast.success('Report ready to share/save');
        } catch (err) {
          console.error('Capacitor export failed', err);
          // Fallback to blob if filesystem fails
          const pdfOutput = doc.output('blob');
          const url = URL.createObjectURL(pdfOutput);
          const link = document.body.appendChild(document.createElement('a'));
          link.href = url;
          link.download = fileName;
          link.click();
          document.body.removeChild(link);
        }
      } else {
        doc.save(`${family.name}_Family_Report.pdf`);
      }
      toast.success('PDF Report generated!');
      setIsPdfExportOpen(false);
    } catch (error) {
      console.error('PDF Error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (!family) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 md:space-y-12 py-6 md:py-12">
        <div className="text-center space-y-3 md:space-y-4">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-[24px] md:rounded-[30px] flex items-center justify-center mx-auto shadow-inner">
            <Users className="h-8 w-8 md:h-10 md:h-10 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight dark:text-white">Family Sharing</h2>
          <p className="text-muted-foreground text-sm md:text-base font-medium max-w-sm mx-auto px-4">Track finances together with your family members in real-time.</p>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 px-4 md:px-0">
          <Card className="border-none glass shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-black tracking-tight dark:text-white">Create Group</CardTitle>
              <CardDescription className="font-medium">Start a new family group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Group Name</Label>
                <Input 
                  placeholder="e.g. The Smiths" 
                  className="h-12 rounded-xl border-2 glass"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </div>
              <Button className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20" onClick={handleCreateFamily}>
                <Plus className="mr-2 h-5 w-5" />
                Create
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none glass shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-black tracking-tight dark:text-white">Join Group</CardTitle>
              <CardDescription className="font-medium">Enter a shared family code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {myRequest ? (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="text-sm font-black">Request Pending</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Waiting for approval</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full h-10 font-bold rounded-xl border-2 text-destructive hover:bg-destructive/10" onClick={handleWithdrawRequest}>
                    Withdraw Request
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider ml-1">Family Code</Label>
                    <Input 
                      placeholder="e.g. AB12CD" 
                      className="h-12 rounded-xl border-2 glass uppercase"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" className="w-full h-12 font-black rounded-xl border-2" onClick={handleJoinFamily}>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Join
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="min-w-0">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 truncate">{family.name}</h2>
          <p className="text-muted-foreground font-medium mt-1 text-xs md:text-sm">
            Code: <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{family.code}</span>
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button variant="outline" className="h-10 md:h-11 rounded-xl font-bold border-2 text-destructive hover:bg-destructive/10 w-full md:w-auto text-xs md:text-sm">
              <LogOut className="mr-2 h-4 w-4" />
              Leave Family
            </Button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Family?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave "{family.name}"? You will lose access to shared transactions and budgets.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" size="default">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLeaveFamily} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Leave Family
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {pendingRequests.length > 0 && family.ownerId === profile.uid && (
        <Card className="border-none glass shadow-xl rounded-[32px] border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-black tracking-tight flex items-center">
              <Clock className="mr-2 h-5 w-5 text-primary" />
              Pending Requests
            </CardTitle>
            <CardDescription className="font-medium">New members waiting to join.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-primary/10">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{req.userName?.[0] || req.userEmail[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-black">{req.userName || 'New User'}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{req.userEmail}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" className="h-9 w-9 p-0 rounded-lg bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20" onClick={() => handleApproveRequest(req)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-lg border-2 text-destructive hover:bg-destructive/10" onClick={() => handleRejectRequest(req)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none glass shadow-xl rounded-[2rem]">
          <CardHeader className="flex flex-row items-center justify-between p-5 md:p-6">
            <CardTitle className="text-xl md:text-2xl font-black tracking-tight dark:text-white">Members</CardTitle>
            <Button onClick={() => setIsPdfExportOpen(true)} size="sm" className="rounded-xl font-bold h-8 md:h-9 text-xs">
              <Download className="mr-1.5 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
              Report
            </Button>
          </CardHeader>
          <CardContent className="p-5 md:p-6 pt-0 md:pt-0">
            <div className="space-y-4 md:space-y-6">
              {members.map((member) => (
                <div key={member.uid} className="flex items-center justify-between p-3 md:p-4 rounded-2xl bg-accent/5 hover:bg-accent/10 transition-colors">
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={member.photoURL} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{member.displayName?.[0] || member.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-black tracking-tight truncate dark:text-white">{member.displayName || 'User'}</p>
                      <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                  {member.uid === family.ownerId && (
                    <div className="flex items-center text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 md:px-3 py-1 md:py-1.5 rounded-full shrink-0">
                      <Shield className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1 md:mr-1.5" />
                      Owner
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none glass shadow-xl rounded-[32px] h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-black tracking-tight dark:text-white">Invite Code</CardTitle>
            <CardDescription className="font-medium">Share this code with others.</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6">
            <div className="text-5xl font-mono font-black tracking-[0.2em] text-primary mb-8 bg-primary/5 py-8 rounded-3xl">
              {family.code}
            </div>
            <Button variant="outline" className="w-full h-12 font-black rounded-xl border-2" onClick={() => {
              navigator.clipboard.writeText(family.code);
              toast.success('Code copied to clipboard');
            }}>
              Copy Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Member Category Summaries */}
      {detailedSummary && detailedSummary.memberMatrix.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {detailedSummary.memberMatrix.map(m => (
            <Card key={m.uid} className="border-none glass shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pb-2 p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-9 w-9 md:h-10 md:w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {m.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base md:text-lg font-black tracking-tight truncate max-w-[100px] md:max-w-none dark:text-white">{m.name}</CardTitle>
                  <CardDescription className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest">Summary</CardDescription>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm md:text-base font-black text-primary">{profile.settings.currency}{m.total.toLocaleString()}</p>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter text-right">Total</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 p-5 md:p-6">
            <div className="space-y-1.5 md:space-y-2">
              {detailedSummary.categories
                .filter(cat => m.spendings[cat] > 0)
                .sort((a, b) => m.spendings[b] - m.spendings[a])
                .map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-xl bg-accent/5">
                    <span className="text-[10px] md:text-xs font-bold text-muted-foreground">{cat}</span>
                    <span className="text-[10px] md:text-xs font-black">{profile.settings.currency}{m.spendings[cat].toLocaleString()}</span>
                  </div>
                ))}
              {Object.keys(m.spendings).filter(cat => m.spendings[cat] > 0).length === 0 && (
                <p className="text-center py-4 text-[10px] font-medium text-muted-foreground italic">No expenses</p>
              )}
            </div>
          </CardContent>
        </Card>
          ))}
        </div>
      )}

      {/* Category Summary Section */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none glass shadow-xl rounded-[32px] overflow-hidden">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <PieChartIcon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl font-black tracking-tight dark:text-white">Category Summary</CardTitle>
            </div>
            <CardDescription className="font-medium">Expense breakdown for all family members.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {categorySummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySummary}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categorySummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderRadius: '16px', 
                      border: '1px solid var(--border)', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    formatter={(value: number) => [`${profile.settings.currency} ${value.toLocaleString()}`, 'Total']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm font-bold text-muted-foreground">No family expenses yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {family.ownerId === profile.uid && (
          <Card className="border-none glass shadow-xl rounded-[32px] overflow-hidden">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl font-black tracking-tight dark:text-white">Admin Details</CardTitle>
              </div>
              <CardDescription className="font-medium">Detailed transaction log (Admin only).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {transactions
                  .filter(tx => tx.familyId === family.id || tx.isFamily)
                  .slice(0, 10)
                  .map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/5 text-xs">
                      <div className="flex flex-col">
                        <span className="font-black truncate max-w-[150px]">{tx.description}</span>
                        <span className="text-muted-foreground font-bold uppercase tracking-tighter">{tx.category}</span>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-black", tx.type === 'income' ? "text-green-500" : "text-red-500")}>
                          {tx.type === 'income' ? '+' : '-'}{profile.settings.currency}{tx.amount}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground">{format(tx.date.toDate(), 'MMM dd')}</p>
                      </div>
                    </div>
                  ))}
                {transactions.filter(tx => tx.familyId === family.id || tx.isFamily).length > 10 && (
                  <p className="text-[10px] text-center font-bold text-muted-foreground py-2">Download PDF for full history</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isPdfExportOpen} onOpenChange={setIsPdfExportOpen}>
        <DialogContent className="glass border border-white/20 shadow-2xl rounded-[2.5rem] dark:bg-zinc-900/90 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Export Family PDF</DialogTitle>
            <DialogDescription className="font-medium">
              Select the duration of family transactions and summaries to include in your PDF report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Duration</Label>
              <Select value={pdfDuration} onValueChange={(v: any) => setPdfDuration(v)}>
                <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                  <SelectItem value="all" className="font-bold">All Transactions</SelectItem>
                  <SelectItem value="10days" className="font-bold">Last 10 Days</SelectItem>
                  <SelectItem value="15days" className="font-bold">Last 15 Days</SelectItem>
                  <SelectItem value="1month" className="font-bold">Last 1 Month</SelectItem>
                  <SelectItem value="1year" className="font-bold">Last 1 Year</SelectItem>
                  <SelectItem value="custom" className="font-bold">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pdfDuration === 'custom' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Start Date</Label>
                  <Input 
                    type="date" 
                    value={pdfStartDate} 
                    onChange={(e) => setPdfStartDate(e.target.value)} 
                    className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">End Date</Label>
                  <Input 
                    type="date" 
                    value={pdfEndDate} 
                    onChange={(e) => setPdfEndDate(e.target.value)} 
                    className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white font-bold" 
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" onClick={() => setIsPdfExportOpen(false)} className="w-full sm:flex-1 rounded-xl border-2 font-bold h-12">Cancel</Button>
            <Button onClick={generatePDF} className="w-full sm:flex-1 h-12 font-black rounded-xl shadow-lg shadow-primary/20">Generate PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
