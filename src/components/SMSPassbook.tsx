import React, { useState, useEffect, useMemo } from 'react';
import { SMSPassbookEntry } from '../types';
import { db, collection, onSnapshot, query, where, orderBy, addDoc, doc, deleteDoc, Timestamp, handleFirestoreError, OperationType, auth, updateDoc } from '../lib/firebase';
import { NativeService } from '../lib/native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, CheckCircle2, AlertCircle, Search, Landmark, CreditCard, ArrowUpRight, ArrowDownRight, Trash2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { parseSMSWithAI } from '../lib/gemini';

interface SMSPassbookProps {
  userId: string;
  currency: string;
}

export function SMSPassbook({ userId, currency }: SMSPassbookProps) {
  const [entries, setEntries] = useState<SMSPassbookEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'smsPassbook'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SMSPassbookEntry)));
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.LIST, 'smsPassbook');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const bankGroups = useMemo(() => {
    const groups: Record<string, SMSPassbookEntry[]> = {};
    entries.forEach(entry => {
      const bank = entry.bankName || 'Other';
      if (!groups[bank]) groups[bank] = [];
      groups[bank].push(entry);
    });
    return groups;
  }, [entries]);

  const bankStats = useMemo(() => {
    return Object.entries(bankGroups).map(([bank, bankEntries]: [string, SMSPassbookEntry[]]) => {
      const balance = bankEntries.reduce((acc: number, entry: SMSPassbookEntry) => {
        if (!entry.parsedAmount) return acc;
        return entry.parsedType === 'income' ? acc + entry.parsedAmount : acc - entry.parsedAmount;
      }, 0);
      const last4 = bankEntries.find((e: SMSPassbookEntry) => e.accountLast4)?.accountLast4;
      return { bank, balance, last4, count: bankEntries.length };
    });
  }, [bankGroups]);

  const filteredEntries = (bank: string) => {
    const list = bankGroups[bank] || [];
    return list.filter(entry => 
      entry.body.toLowerCase().includes(search.toLowerCase()) ||
      entry.address.toLowerCase().includes(search.toLowerCase())
    );
  };

  const handleSync = async () => {
    try {
      const granted = await NativeService.requestSMSPermissions();
      if (!granted) {
        toast.error('SMS permissions required to sync passbook');
        return;
      }

      toast.loading('Syncing SMS messages...', { id: 'sync' });
      await NativeService.readInbox(async (messages) => {
        let addedCount = 0;
        for (const msg of messages) {
          // Check if already exists
          const exists = entries.some(e => e.body === msg.body && e.date.toMillis() === msg.date);
          if (!exists) {
            const aiData = await parseSMSWithAI(msg.body);
            if (aiData && aiData.amount > 0) {
              await addDoc(collection(db, 'smsPassbook'), {
                userId,
                address: msg.address,
                body: msg.body,
                date: Timestamp.fromMillis(msg.date),
                parsedAmount: aiData.amount,
                parsedType: aiData.type,
                bankName: aiData.bankName,
                accountLast4: aiData.accountLast4,
                isAdded: false // Not added to transactions yet
              });
              addedCount++;
            }
          }
        }
        toast.dismiss('sync');
        if (addedCount > 0) {
          toast.success(`Synced ${addedCount} new messages`);
        } else {
          toast.info('Passbook is up to date');
        }
      });
    } catch (error) {
      toast.dismiss('sync');
      toast.error('Failed to sync SMS');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'smsPassbook', id));
      toast.success('Message removed from passbook');
    } catch (error) {
      toast.error('Failed to remove message');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">AI SMS Passbook</h2>
          <p className="text-muted-foreground text-sm font-medium">Bank-wise tracking from your messages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search messages..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-2 glass font-bold"
            />
          </div>
          <Button variant="outline" className="rounded-xl border-2 h-12 font-bold px-6" onClick={handleSync}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync SMS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {bankStats.map((stat) => (
          <Card key={stat.bank} className="rounded-[2rem] border-none glass shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Landmark className="h-16 w-16" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">{stat.bank}</h3>
                  {stat.last4 && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">A/C XX{stat.last4}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detected Balance</p>
                <p className={cn(
                  "text-2xl font-black tracking-tighter",
                  stat.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {currency} {stat.balance.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground mt-4 uppercase tracking-widest">{stat.count} Transactions</p>
            </CardContent>
          </Card>
        ))}
        {bankStats.length === 0 && (
          <Card className="md:col-span-3 rounded-[2rem] border-none glass shadow-xl p-8 text-center border-2 border-dashed">
            <p className="text-muted-foreground font-medium">No bank accounts detected yet. Import or receive SMS to see them here.</p>
          </Card>
        )}
      </div>

      <Tabs defaultValue="All" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-transparent h-auto p-0 gap-2">
            <TabsTrigger 
              value="All"
              className="rounded-xl px-4 py-2 border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold text-xs transition-all"
            >
              All Messages
            </TabsTrigger>
            {Object.keys(bankGroups).map(bank => (
              <TabsTrigger 
                key={bank} 
                value={bank}
                className="rounded-xl px-4 py-2 border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold text-xs transition-all"
              >
                {bank}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="All" className="space-y-4 mt-6">
          {entries.filter(e => e.body.toLowerCase().includes(search.toLowerCase())).map((entry) => (
            <div key={entry.id}>
              <SMSCard entry={entry} currency={currency} onDelete={() => handleDelete(entry.id!)} />
            </div>
          ))}
        </TabsContent>

        {Object.keys(bankGroups).map(bank => (
          <TabsContent key={bank} value={bank} className="space-y-4 mt-6">
            {filteredEntries(bank).map((entry) => (
              <div key={entry.id}>
                <SMSCard entry={entry} currency={currency} onDelete={() => handleDelete(entry.id!)} />
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SMSCard({ entry, currency, onDelete }: { entry: SMSPassbookEntry, currency: string, onDelete: () => void }) {
  return (
    <Card className="rounded-[2rem] border-none glass overflow-hidden border border-white/20 shadow-lg group/card">
      <CardContent className="p-6 flex items-start gap-5">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
          entry.isAdded ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-accent/20 text-muted-foreground"
        )}>
          {entry.bankName ? <Landmark className="h-7 w-7" /> : <MessageSquare className="h-7 w-7" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{entry.address}</p>
              {entry.accountLast4 && (
                <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                  A/C XX{entry.accountLast4}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-bold text-muted-foreground">{format(entry.date.toDate(), 'MMM dd, HH:mm')}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-lg text-destructive opacity-0 group-hover/card:opacity-100 transition-opacity"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-sm font-bold leading-relaxed mb-4 text-foreground/80">{entry.body}</p>
          <div className="flex items-center justify-between">
            {entry.parsedAmount ? (
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-black px-4 py-1.5 rounded-xl shadow-sm flex items-center gap-2",
                  entry.parsedType === 'income' ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  {entry.parsedType === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {currency} {entry.parsedAmount.toLocaleString()}
                </span>
              </div>
            ) : <div />}
            
            {entry.isAdded ? (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest bg-green-500/5 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Auto-Tracked
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-accent/10 px-3 py-1.5 rounded-full">
                <AlertCircle className="h-3.5 w-3.5" />
                Pending
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
