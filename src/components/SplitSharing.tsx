import React, { useState, useEffect, useMemo } from 'react';
import { SplitGroup, SplitExpense, UserProfile } from '../types';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc, Timestamp, getDocs, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Plus, Trash2, Users, Receipt, ArrowRight, UserPlus, CheckCircle2, DollarSign, Edit2, ArrowDownLeft, ArrowUpRight, Check, Copy, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface SplitSharingProps {
  profile: UserProfile;
}

export function SplitSharing({ profile }: SplitSharingProps) {
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SplitGroup | null>(null);
  const [expenses, setExpenses] = useState<SplitExpense[]>([]);
  
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SplitExpense | null>(null);
  
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState(false);
  const [createdGroupCode, setCreatedGroupCode] = useState<string | null>(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'splitGroups'), where('members', 'array-contains', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SplitGroup)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'splitGroups');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  useEffect(() => {
    if (!selectedGroup) return;
    const q = query(collection(db, 'splitExpenses'), where('groupId', '==', selectedGroup.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SplitExpense)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'splitExpenses');
      }
    });
    return () => unsubscribe();
  }, [selectedGroup]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'splitGroups';
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupData = {
        name: groupName,
        code,
        members: [profile.uid],
        memberNames: { [profile.uid]: profile?.displayName || profile?.email || 'User' },
        ownerId: profile.uid,
        createdAt: Timestamp.now(),
      };
      
      const docRef = await addDoc(collection(db, path), groupData);
      
      toast.success(`Group created! Code: ${code}`);
      setCreatedGroupCode(code);
      setIsAddGroupOpen(false);
      setGroupName('');
      
      // Auto-select the newly created group
      setSelectedGroup({ id: docRef.id, ...groupData } as SplitGroup);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    const path = 'splitGroups';
    try {
      const q = query(collection(db, path), where('code', '==', joinCode.toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast.error('Invalid group code');
        return;
      }

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data() as SplitGroup;

      if (groupData.members.includes(profile.uid)) {
        toast.error('You are already a member of this group');
        return;
      }

      await updateDoc(doc(db, path, groupDoc.id), {
        members: [...groupData.members, profile.uid],
        [`memberNames.${profile.uid}`]: profile?.displayName || profile?.email || 'User'
      });

      toast.success(`Joined group: ${groupData.name}`);
      setIsJoinGroupOpen(false);
      setJoinCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error('Failed to join group');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    const path = 'splitExpenses';
    try {
      const amount = parseFloat(expenseAmount);
      const splitAmount = amount / selectedGroup.members.length;
      const splits: { [uid: string]: number } = {};
      selectedGroup.members.forEach(uid => {
        splits[uid] = splitAmount;
      });

      const expenseData = {
        groupId: selectedGroup.id,
        payerId: profile.uid,
        payerName: profile?.displayName || profile?.email || 'User',
        amount,
        description: expenseDesc,
        date: editingExpense ? editingExpense.date : Timestamp.now(),
        splitType: 'equal',
        splits,
      };

      if (editingExpense) {
        await updateDoc(doc(db, path, editingExpense.id), expenseData);
        
        // Update linked transaction if exists
        if (editingExpense.transactionId) {
          try {
            await updateDoc(doc(db, 'transactions', editingExpense.transactionId), {
              amount,
              description: `Group Expense: ${expenseDesc} (${selectedGroup.name})`,
            });
          } catch (error) {
            console.error('Failed to update linked transaction', error);
          }
        }
        
        toast.success('Expense updated');
      } else {
        // Record in personal transactions first to get ID
        const txRef = await addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          familyId: profile.familyId || null,
          amount,
          type: 'expense',
          category: 'Split Sharing',
          description: `Group Expense: ${expenseDesc} (${selectedGroup.name})`,
          date: Timestamp.now(),
          isFamily: !!profile.familyId,
          paymentMode: 'Account'
        });

        await addDoc(collection(db, path), {
          ...expenseData,
          transactionId: txRef.id
        });
        
        toast.success('Expense added & transaction recorded');
      }
      
      setIsAddExpenseOpen(false);
      setEditingExpense(null);
      setExpenseDesc('');
      setExpenseAmount('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error('Failed to save expense');
    }
  };

  const handleDeleteExpense = async (expense: SplitExpense) => {
    const path = 'splitExpenses';
    try {
      await deleteDoc(doc(db, path, expense.id));
      
      // Delete linked transaction if exists
      if (expense.transactionId) {
        try {
          await deleteDoc(doc(db, 'transactions', expense.transactionId));
        } catch (error) {
          console.error('Failed to delete linked transaction', error);
        }
      }
      
      toast.success('Expense deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error('Failed to delete expense');
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const path = 'splitGroups';
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      
      if (group.ownerId === profile.uid && group.members.length > 1) {
        toast.error('You must transfer ownership before leaving');
        return;
      }

      const newMembers = group.members.filter(uid => uid !== profile.uid);
      if (newMembers.length === 0) {
        await deleteDoc(doc(db, path, groupId));
      } else {
        await updateDoc(doc(db, path, groupId), {
          members: newMembers
        });
      }
      
      setSelectedGroup(null);
      toast.success('Left group');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error('Failed to leave group');
    }
  };

  const handleSettle = async (fromUid: string, toUid: string, amount: number) => {
    if (!selectedGroup) return;
    const path = 'splitExpenses';
    try {
      await addDoc(collection(db, path), {
        groupId: selectedGroup.id,
        payerId: fromUid,
        payerName: selectedGroup.memberNames?.[fromUid] || 'Member',
        amount,
        description: `Settlement to ${selectedGroup.memberNames?.[toUid] || 'Member'}`,
        date: Timestamp.now(),
        splitType: 'settlement',
        splits: { [toUid]: amount },
      });

      // If I am the receiver, record income
      if (toUid === profile.uid) {
        await addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          familyId: profile.familyId || null,
          amount,
          type: 'income',
          category: 'Split Sharing',
          description: `Received Settlement from ${selectedGroup.memberNames?.[fromUid] || 'Member'}`,
          date: Timestamp.now(),
          isFamily: !!profile.familyId,
          paymentMode: 'Account'
        });
      }
      
      toast.success('Settlement recorded & transaction added');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      toast.error('Failed to record settlement');
    }
  };

  const settlements = useMemo(() => {
    if (!selectedGroup) return [];
    const balances: { [uid: string]: number } = {};
    selectedGroup.members.forEach(uid => balances[uid] = 0);

    expenses.forEach(exp => {
      balances[exp.payerId] = (balances[exp.payerId] || 0) + exp.amount;
      Object.entries(exp.splits).forEach(([uid, amt]) => {
        if (balances[uid] !== undefined) {
          balances[uid] -= Number(amt);
        }
      });
    });

    return Object.entries(balances).map(([uid, balance]) => ({
      uid,
      balance,
      label: uid === profile.uid ? 'You' : (selectedGroup.memberNames?.[uid] || 'Member')
    }));
  }, [selectedGroup, expenses, profile.uid]);

  const settlementInstructions = useMemo(() => {
    if (!selectedGroup || settlements.length === 0) return [];
    
    // Deep copy to avoid mutating memoized state
    const payers = settlements
      .filter(s => s.balance < -0.01)
      .map(s => ({ ...s, balance: Math.abs(s.balance) }));
    const receivers = settlements
      .filter(s => s.balance > 0.01)
      .map(s => ({ ...s }));
    
    const instructions: { from: string, to: string, fromName: string, toName: string, amount: number }[] = [];
    
    let pIdx = 0;
    let rIdx = 0;
    
    while (pIdx < payers.length && rIdx < receivers.length) {
      const payer = payers[pIdx];
      const receiver = receivers[rIdx];
      
      const amount = Math.min(payer.balance, receiver.balance);
      if (amount > 0.01) {
        instructions.push({
          from: payer.uid,
          fromName: payer.label,
          to: receiver.uid,
          toName: receiver.label,
          amount
        });
      }
      
      payer.balance -= amount;
      receiver.balance -= amount;
      
      if (payer.balance < 0.01) pIdx++;
      if (receiver.balance < 0.01) rIdx++;
    }
    
    return instructions;
  }, [selectedGroup, settlements]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className={cn(
          "flex items-center gap-4",
          selectedGroup ? "flex" : "flex"
        )}>
          {selectedGroup && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-12 w-12 rounded-2xl glass hover:bg-primary/5 active:scale-95 transition-transform"
              onClick={() => setSelectedGroup(null)}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          )}
          <div>
            <h2 className="text-3xl font-black tracking-tighter dark:text-white">Split Share</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Settle Expenses with Friends</p>
          </div>
        </div>
        
        <div className={cn(
          "flex items-center gap-3",
          selectedGroup ? "hidden md:flex" : "flex"
        )}>
          <Dialog open={isJoinGroupOpen} onOpenChange={setIsJoinGroupOpen}>
            <DialogTrigger render={
              <Button variant="outline" className="flex-1 md:flex-none h-12 px-4 md:px-6 font-black rounded-2xl border-2 dark:border-white/20 dark:hover:bg-white/5">
                <UserPlus className="mr-2 h-5 w-5" />
                Join
              </Button>
            } />
            <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem] dark:bg-zinc-900/90">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Join Split Group</DialogTitle>
                <DialogDescription className="font-medium">Enter the group code to join.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJoinGroup} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Group Code</Label>
                  <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. AB12CD" className="h-12 rounded-xl border-2 uppercase" required />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Join Group</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger render={
              <Button className="flex-1 md:flex-none h-12 px-4 md:px-6 font-black rounded-2xl shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-5 w-5" />
                Create
              </Button>
            } />
            <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem] dark:bg-zinc-900/90">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight dark:text-white">Create Split Group</DialogTitle>
                <DialogDescription className="font-medium">Group for shared expenses.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1 dark:text-white/70">Group Name</Label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Roommates, Trip to Goa" className="h-12 rounded-xl border-2 dark:bg-black/20 dark:border-white/10 dark:text-white" required />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Create Group</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className={cn(
          "md:col-span-1 space-y-4 transition-all duration-300",
          selectedGroup ? "hidden md:block" : "block"
        )}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-4 dark:text-white/70 tracking-[0.3em]">Your Groups</h3>
          <div className="grid grid-cols-1 gap-2">
            {groups.length === 0 ? (
              <div className="p-8 text-center glass rounded-[2.5rem] border-2 border-dashed border-muted-foreground/10 space-y-3">
                <Users className="h-10 w-10 mx-auto opacity-20" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No groups yet</p>
              </div>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-[1.8rem] transition-all group relative overflow-hidden",
                    selectedGroup?.id === group.id 
                      ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 active:scale-[0.98]" 
                      : "glass hover:bg-primary/5 active:scale-95"
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "p-2.5 rounded-2xl shadow-sm transition-colors",
                      selectedGroup?.id === group.id ? "bg-white/20" : "bg-primary/10 text-primary"
                    )}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-sm truncate max-w-[120px] dark:text-white">{group.name}</p>
                      <div className="flex flex-col gap-1">
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest leading-none",
                          selectedGroup?.id === group.id ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {group.members.length} Members
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-medium opacity-60">CODE:</span>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-md font-black tracking-widest uppercase",
                            selectedGroup?.id === group.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          )}>
                            {group.code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={cn(
                    "h-4 w-4 transition-transform relative z-10",
                    selectedGroup?.id === group.id ? "translate-x-1" : "text-muted-foreground group-hover:translate-x-1"
                  )} />
                </button>
              ))
            )}
          </div>
        </div>

        <div className={cn(
          "md:col-span-2 space-y-4",
          selectedGroup ? "block" : "hidden md:block"
        )}>
          {selectedGroup ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 py-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="md:hidden h-9 w-9 rounded-xl glass hover:bg-primary/5 active:scale-95 transition-transform"
                      onClick={() => setSelectedGroup(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h3 className="text-xl md:text-sm font-black uppercase tracking-widest dark:text-white">{selectedGroup.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Invite Code:</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedGroup.code);
                        toast.success('Code copied to clipboard');
                      }}
                      className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full active:scale-95 transition-transform"
                    >
                      {selectedGroup.code}
                      <Copy className="h-2.5 w-2.5 ml-1" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 md:flex-none h-11 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-destructive border-destructive/20 hover:bg-destructive/10"
                    onClick={() => handleLeaveGroup(selectedGroup.id)}
                  >
                    Leave Group
                  </Button>
                  <Dialog open={isAddExpenseOpen} onOpenChange={(open) => {
                    setIsAddExpenseOpen(open);
                    if (!open) {
                      setEditingExpense(null);
                      setExpenseDesc('');
                      setExpenseAmount('');
                    }
                  }}>
                    <DialogTrigger render={<Button size="sm" className="flex-1 md:flex-none h-11 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20" />}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Add Expense
                    </DialogTrigger>
                    <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight">{editingExpense ? 'Edit' : 'Add'} Group Expense</DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground">Split equally among all members.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddExpense} className="space-y-5 py-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Description</Label>
                          <Input value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)} placeholder="e.g. Dinner, Uber" className="h-12 rounded-xl border-2" required />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] ml-1">Amount</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-muted-foreground">{profile.settings.currency}</span>
                            <Input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="h-12 rounded-xl border-2 pl-12" required />
                          </div>
                        </div>
                        <div className="p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10 shadow-inner">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Split Breakdown</p>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-muted-foreground">{selectedGroup.members.length} Members</p>
                            <p className="text-lg font-black text-primary">
                              {profile.settings.currency} {(parseFloat(expenseAmount || '0') / selectedGroup.members.length).toFixed(2)} <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">each</span>
                            </p>
                          </div>
                        </div>
                        <DialogFooter className="pt-4">
                          <Button type="submit" className="w-full h-14 font-black rounded-xl shadow-xl shadow-primary/30 active:scale-95 transition-transform text-lg">
                            {editingExpense ? 'Update' : 'Add'} Expense
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 md:p-8 rounded-[2.5rem] border border-primary/20 shadow-xl shadow-primary/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary dark:text-white mb-1">Settlement Summary</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Balances within the group</p>
                    </div>
                    <div className="px-4 py-1.5 bg-primary/10 rounded-full text-[10px] font-black text-primary uppercase tracking-widest border border-primary/10">
                      Standard Equal Split
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {settlements.map((s) => (
                      <div key={s.uid} className="glass p-4 rounded-2xl border-primary/5 flex flex-col justify-between min-h-[100px]">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 mb-1">{s.label}</p>
                          <p className={cn(
                            "text-xl font-black tracking-tighter",
                            s.balance > 0 ? "text-green-600" : s.balance < 0 ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {s.balance > 0 ? '+' : s.balance < 0 ? '-' : ''}{profile.settings.currency}{Math.abs(s.balance).toLocaleString()}
                          </p>
                        </div>
                        <p className={cn(
                          "text-[9px] font-black uppercase mt-3 py-1 px-2 rounded-lg inline-block text-center",
                          s.balance > 0 ? "bg-green-100 text-green-700" : s.balance < 0 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                        )}>
                          {s.balance > 0 ? 'To Receive' : s.balance < 0 ? 'To Pay' : 'Settled Up'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {settlementInstructions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Payment Instructions</h4>
                    <div className="grid gap-3">
                      {settlementInstructions.map((inst, idx) => (
                        <Card key={idx} className="border-none glass shadow-md rounded-2xl overflow-hidden border-l-4 border-primary">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{inst.fromName}</p>
                                <p className="text-xs font-bold">Pays</p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-primary" />
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{inst.toName}</p>
                                <p className="text-sm font-black text-primary">{profile.settings.currency}{inst.amount.toFixed(2)}</p>
                              </div>
                            </div>
                            
                            {inst.to === profile.uid && (
                              <AlertDialog>
                                <AlertDialogTrigger render={
                                  <Button size="sm" variant="outline" className="h-9 rounded-xl font-bold border-2 hover:bg-primary/10">
                                    <Check className="mr-2 h-3.5 w-3.5" />
                                    Settle
                                  </Button>
                                } />
                                <AlertDialogContent className="glass border-none shadow-2xl rounded-[2rem]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-black">Confirm Settlement</AlertDialogTitle>
                                    <AlertDialogDescription className="font-medium">
                                      Are you sure you want to mark this payment of <strong>{profile.settings.currency}{inst.amount.toFixed(2)}</strong> from <strong>{inst.fromName}</strong> to <strong>{inst.toName}</strong> as settled?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel variant="outline" size="default" className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleSettle(inst.from, inst.to, inst.amount)}
                                      className="rounded-xl font-black bg-primary text-primary-foreground"
                                    >
                                      Confirm Settlement
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {expenses.map((expense) => (
                  <Card key={expense.id} className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-black truncate dark:text-white">{expense.description}</p>
                          <p className="text-sm font-black text-primary">
                            {profile.settings.currency}{expense.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Paid by {expense.payerId === profile.uid ? 'You' : (selectedGroup.memberNames?.[expense.payerId] || 'Member')}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {format(expense.date.toDate(), 'MMM dd')}
                            </p>
                            {expense.payerId === profile.uid && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingExpense(expense);
                                    setExpenseDesc(expense.description);
                                    setExpenseAmount(expense.amount.toString());
                                    setIsAddExpenseOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteExpense(expense)}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {expenses.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-[2rem] border-muted/20">
                    <p className="text-xs font-bold uppercase tracking-widest">No expenses yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
              <Users className="h-12 w-12 opacity-20 mb-4" />
              <p className="font-bold text-sm uppercase tracking-widest">Select a group to view activity</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!createdGroupCode} onOpenChange={(open) => !open && setCreatedGroupCode(null)}>
        <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem] p-8 text-center max-w-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-center tracking-tight">Group Created!</DialogTitle>
            <DialogDescription className="text-center font-medium pt-2">
              Share this code with your friends so they can join and split expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-8 p-8 bg-primary rounded-[2.5rem] shadow-2xl shadow-primary/30 group cursor-pointer active:scale-95 transition-transform" 
            onClick={() => {
              if (createdGroupCode) {
                navigator.clipboard.writeText(createdGroupCode);
                toast.success('Code copied to clipboard');
              }
            }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary-foreground/60 mb-3">Your Group Code</p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-5xl font-black text-white tracking-[0.15em] shrink-0">{createdGroupCode}</p>
              <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                <Copy className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-[9px] font-bold text-white/50 mt-4 uppercase tracking-widest">Tap to Copy & Invite Friends</p>
          </div>
          <Button onClick={() => setCreatedGroupCode(null)} className="w-full mt-8 h-12 rounded-xl font-black">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
