import React, { useState, useEffect } from 'react';
import { Due, UserProfile } from '../types';
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
import { Plus, Trash2, User, Calendar, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

interface DuesRemindersProps {
  profile: UserProfile;
}

export function DuesReminders({ profile }: DuesRemindersProps) {
  const [dues, setDues] = useState<Due[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [contactName, setContactName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'lent' | 'owed'>('lent');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'dues'), where('userId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Due)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'dues');
      }
    });
    return () => unsubscribe();
  }, [profile.uid]);

  const handleAddDue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'dues'), {
        userId: profile.uid,
        contactName,
        amount: parseFloat(amount),
        type,
        status: 'pending',
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        description,
      });
      toast.success('Record added successfully');
      setIsAddOpen(false);
      setContactName('');
      setAmount('');
      setDueDate('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to add record');
    }
  };

  const handleMarkPaid = async (due: Due) => {
    try {
      await updateDoc(doc(db, 'dues', due.id), {
        status: 'paid'
      });

      await addDoc(collection(db, 'transactions'), {
        userId: profile.uid,
        familyId: profile.familyId || null,
        amount: due.amount,
        type: due.type === 'lent' ? 'income' : 'expense',
        category: 'Dues',
        description: `Due Settlement: ${due.contactName} (${due.type})`,
        date: Timestamp.now(),
        isFamily: !!profile.familyId,
        paymentMode: 'Account'
      });

      toast.success('Marked as paid & transaction recorded');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'dues', id));
      toast.success('Record removed');
    } catch (error) {
      toast.error('Failed to remove record');
    }
  };

  const filteredDues = dues.filter(d => 
    d.contactName.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());

  const totalLent = dues.filter(d => d.type === 'lent' && d.status === 'pending').reduce((acc, d) => acc + d.amount, 0);
  const totalOwed = dues.filter(d => d.type === 'owed' && d.status === 'pending').reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">Dues & Reminders</h2>
          <p className="text-muted-foreground text-sm font-medium">Track money lent or owed</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-11 rounded-xl border-2 glass font-bold"
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button className="h-11 px-5 font-black rounded-xl shadow-lg shadow-primary/20 w-full md:w-auto" />}>
              <Plus className="mr-2 h-5 w-5" />
              Add Due
            </DialogTrigger>
            <DialogContent className="glass border-none shadow-2xl rounded-[2.5rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Add Due Record</DialogTitle>
                <DialogDescription className="font-medium">Track money with friends or family.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDue} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Type</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="h-12 rounded-2xl border font-bold dark:bg-black/20 dark:border-white/10 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none dark:bg-zinc-900 dark:border-white/10 dark:text-white">
                      <SelectItem value="lent">I Lent Money (They owe me)</SelectItem>
                      <SelectItem value="owed">I Owed Money (I owe them)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. John Doe" className="h-12 rounded-xl border-2" required />
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
                  <Label className="text-xs font-bold uppercase tracking-wider ml-1">Description (Optional)</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. For dinner" className="h-12 rounded-xl border-2" />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20">Save Record</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Lent</p>
            <h3 className="text-2xl font-black dark:text-white">{profile.settings.currency}{totalLent.toLocaleString()}</h3>
          </CardContent>
        </Card>
        <Card className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Total Owed</p>
            <h3 className="text-2xl font-black dark:text-white">{profile.settings.currency}{totalOwed.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredDues.map((due) => {
          const isOverdue = due.status === 'pending' && isBefore(due.dueDate.toDate(), new Date());
          
          return (
            <Card key={due.id} className={cn(
              "border-none glass shadow-lg rounded-[2rem] overflow-hidden transition-all",
              due.status === 'paid' ? "opacity-60" : "opacity-100"
            )}>
              <CardContent className="p-6 flex items-center gap-5">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                  due.status === 'paid' ? "bg-green-500/10 text-green-600" : 
                  due.type === 'lent' ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                )}>
                  {due.status === 'paid' ? <CheckCircle2 className="h-7 w-7" /> : 
                   due.type === 'lent' ? <ArrowUpRight className="h-7 w-7" /> : <ArrowDownRight className="h-7 w-7" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-black tracking-tight truncate dark:text-white">{due.contactName}</h3>
                    <span className={cn(
                      "text-lg font-black",
                      due.type === 'lent' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {due.type === 'lent' ? '+' : '-'}{profile.settings.currency}{due.amount.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {format(due.dueDate.toDate(), 'MMM dd')}
                    </div>
                    {due.description && (
                      <div className="text-[10px] font-bold text-muted-foreground truncate max-w-[150px]">
                        • {due.description}
                      </div>
                    )}
                    {isOverdue && (
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-500/5 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3 mr-1" />
                        Overdue
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {due.status === 'pending' && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2"
                      onClick={() => handleMarkPaid(due)}
                    >
                      Mark Paid
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(due.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredDues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
            <div className="w-20 h-20 bg-muted/10 rounded-full flex items-center justify-center mb-6">
              <User className="h-10 w-10 opacity-40" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-foreground dark:text-white">No Records Found</h3>
            <p className="font-medium text-sm mt-1">Keep track of money with your contacts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
