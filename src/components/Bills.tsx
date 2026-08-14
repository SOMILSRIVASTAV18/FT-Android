import React, { useState, useEffect } from 'react';
import { Bill, UserProfile } from '../types';
import { db, collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc, Timestamp, handleFirestoreError, OperationType, auth } from '../lib/firebase';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Trash2, Calendar, CreditCard, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface BillsProps {
  profile: UserProfile;
}

export function Bills({ profile }: BillsProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'bills'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'bills');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'bills'), {
        userId: profile.uid,
        name,
        amount: parseFloat(amount),
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        category,
        isRecurring,
        status: 'unpaid',
      });
      toast.success('Bill added successfully');
      setIsAddOpen(false);
      setName('');
      setAmount('');
      setDueDate('');
      setCategory('');
      setIsRecurring(false);
    } catch (error) {
      toast.error('Failed to add bill');
    }
  };

  const handleTogglePaid = async (bill: Bill) => {
    try {
      const newStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
      let transactionId = bill.transactionId || null;

      if (newStatus === 'paid') {
        const txRef = await addDoc(collection(db, 'transactions'), {
          userId: profile.uid,
          familyId: profile.familyId || null,
          amount: bill.amount,
          type: 'expense',
          category: bill.category || 'Bills',
          description: `Bill Payment: ${bill.name}`,
          date: Timestamp.now(),
          isFamily: !!profile.familyId,
          paymentMode: 'Account'
        });
        transactionId = txRef.id;
      } else if (bill.transactionId) {
        try {
          await deleteDoc(doc(db, 'transactions', bill.transactionId));
          transactionId = null;
        } catch (error) {
          console.error('Failed to delete linked transaction', error);
        }
      }

      await updateDoc(doc(db, 'bills', bill.id), {
        status: newStatus,
        lastPaidDate: newStatus === 'paid' ? Timestamp.now() : null,
        transactionId
      });

      toast.success(newStatus === 'paid' ? 'Bill marked as paid & transaction recorded' : 'Bill marked as unpaid');
    } catch (error) {
      toast.error('Failed to update bill status');
    }
  };

  const handleDeleteBill = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bills', id));
      toast.success('Bill removed');
    } catch (error) {
      toast.error('Failed to remove bill');
    }
  };

  const sortedBills = [...bills].sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Bills & Reminders</h2>
          <p className="text-muted-foreground text-sm font-medium">Never miss a payment again</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="h-11 px-5 font-black rounded-xl shadow-lg shadow-primary/20 w-full md:w-auto" />}>
            <Plus className="mr-2 h-5 w-5" />
            Add Bill
          </DialogTrigger>
          <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight">Add New Bill</DialogTitle>
              <DialogDescription className="font-medium">Set a reminder for your upcoming bill.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBill} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Bill Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Electricity, Internet" className="h-12 rounded-xl border-2" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Amount</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 rounded-xl border-2" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-12 rounded-xl border-2" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider ml-1">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                    {profile.categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Set Reminder</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {sortedBills.map((bill) => {
          const isOverdue = bill.status === 'unpaid' && isBefore(bill.dueDate.toDate(), new Date());
          const isUpcoming = bill.status === 'unpaid' && isBefore(bill.dueDate.toDate(), addDays(new Date(), 7)) && !isOverdue;

          return (
            <Card key={bill.id} className={cn(
              "border-none glass shadow-lg rounded-[2rem] overflow-hidden transition-all",
              bill.status === 'paid' ? "opacity-60" : "opacity-100"
            )}>
              <CardContent className="p-6 flex items-center gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  bill.status === 'paid' ? "bg-green-500/10 text-green-600" : 
                  isOverdue ? "bg-red-500/10 text-red-600" :
                  isUpcoming ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  {bill.status === 'paid' ? <CheckCircle2 className="h-7 w-7" /> : <CreditCard className="h-7 w-7" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-black tracking-tight truncate dark:text-white">{bill.name}</h3>
                    <span className="text-lg font-black text-primary">
                      {profile.settings.currency}{bill.amount.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      Due {format(bill.dueDate.toDate(), 'MMM dd')}
                    </div>
                    {isOverdue && (
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-500/5 px-2 py-0.5 rounded-full">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Overdue
                      </div>
                    )}
                    {isUpcoming && (
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3 mr-1" />
                        Soon
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant={bill.status === 'paid' ? "outline" : "default"}
                    size="sm"
                    className={cn(
                      "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest",
                      bill.status === 'paid' ? "border-2" : "shadow-lg shadow-primary/20"
                    )}
                    onClick={() => handleTogglePaid(bill)}
                  >
                    {bill.status === 'paid' ? 'Paid' : 'Pay Now'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBill(bill.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {bills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
            <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 opacity-40" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-foreground dark:text-white">No Bills Tracked</h3>
            <p className="font-medium text-sm mt-1">Add your recurring bills to stay on top of them.</p>
            <Button variant="outline" className="mt-6 rounded-xl font-bold border-2" onClick={() => setIsAddOpen(true)}>
              Add Your First Bill
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
