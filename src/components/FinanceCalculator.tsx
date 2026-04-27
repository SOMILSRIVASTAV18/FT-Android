import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  TrendingUp, 
  Percent, 
  Calendar, 
  IndianRupee,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function FinanceCalculator() {
  const [calcType, setCalcType] = useState<'sip' | 'loan' | 'fd'>('sip');
  
  // SIP / FD Inputs
  const [amount, setAmount] = useState('5000');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');
  
  // Results
  const [result, setResult] = useState<{ total: number; invested: number; returns: number } | null>(null);

  const calculate = () => {
    const p = parseFloat(amount);
    const r = parseFloat(rate) / 100;
    const n = parseFloat(years);

    if (calcType === 'sip') {
      const monthlyRate = r / 12;
      const months = n * 12;
      const total = p * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
      const invested = p * months;
      setResult({ total, invested, returns: total - invested });
    } else if (calcType === 'loan') {
      const monthlyRate = r / 12;
      const months = n * 12;
      const emi = (p * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
      const total = emi * months;
      setResult({ total, invested: p, returns: total - p }); // returns here is total interest
    } else if (calcType === 'fd') {
      const total = p * Math.pow(1 + r, n);
      setResult({ total, invested: p, returns: total - p });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight dark:text-white">Finance Calculator</h2>
        <p className="text-muted-foreground text-sm font-medium">Plan your investments and loans</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => { setCalcType('sip'); setResult(null); }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all text-left",
                calcType === 'sip' 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "glass hover:bg-primary/5 dark:bg-white/5 dark:text-white"
              )}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="font-bold text-sm">SIP Calculator</span>
            </button>
            <button 
              onClick={() => { setCalcType('loan'); setResult(null); }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all text-left",
                calcType === 'loan' 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "glass hover:bg-primary/5 dark:bg-white/5 dark:text-white"
              )}
            >
              <Percent className="h-5 w-5" />
              <span className="font-bold text-sm">EMI Calculator</span>
            </button>
            <button 
              onClick={() => { setCalcType('fd'); setResult(null); }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all text-left",
                calcType === 'fd' 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "glass hover:bg-primary/5 dark:bg-white/5 dark:text-white"
              )}
            >
              <Calendar className="h-5 w-5" />
              <span className="font-bold text-sm">FD Calculator</span>
            </button>
          </div>

          <Card className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 dark:text-white/70">
                  {calcType === 'loan' ? 'Loan Amount' : 'Investment Amount'}
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-white/50" />
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-10 h-12 rounded-xl border-2 dark:bg-zinc-900 dark:border-white/10 dark:text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 dark:text-white/70">Interest Rate (%)</Label>
                <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="h-12 rounded-xl border-2 dark:bg-zinc-900 dark:border-white/10 dark:text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 dark:text-white/70">Duration (Years)</Label>
                <Input type="number" value={years} onChange={(e) => setYears(e.target.value)} className="h-12 rounded-xl border-2 dark:bg-zinc-900 dark:border-white/10 dark:text-white" />
              </div>
              <Button onClick={calculate} className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/20 mt-2">
                Calculate Now
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          {result ? (
            <div className="space-y-6">
              <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-8 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">Total Value</p>
                  <h3 className="text-5xl font-black tracking-tighter text-primary">
                    ₹{Math.round(result.total).toLocaleString()}
                  </h3>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
                  <CardContent className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                      {calcType === 'loan' ? 'Principal' : 'Invested'}
                    </p>
                    <h3 className="text-2xl font-black dark:text-white">₹{Math.round(result.invested).toLocaleString()}</h3>
                  </CardContent>
                </Card>
                <Card className="border-none glass shadow-lg rounded-[2rem] overflow-hidden">
                  <CardContent className="p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                      {calcType === 'loan' ? 'Total Interest' : 'Returns Earned'}
                    </p>
                    <h3 className="text-2xl font-black dark:text-white">₹{Math.round(result.returns).toLocaleString()}</h3>
                  </CardContent>
                </Card>
              </div>

              <div className="p-6 rounded-[2rem] bg-primary/5 border-2 border-primary/10 flex items-start gap-4">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                  {calcType === 'sip' && "Systematic Investment Plan (SIP) helps you invest small amounts regularly to build wealth over time through compounding."}
                  {calcType === 'loan' && "EMI is the fixed amount you pay back to the lender every month until the loan is fully repaid."}
                  {calcType === 'fd' && "Fixed Deposit (FD) is a safe investment where you lock your money for a fixed period at a guaranteed interest rate."}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground border-4 border-dashed rounded-[40px] glass border-muted/20">
              <Calculator className="h-12 w-12 opacity-20 mb-4" />
              <p className="font-bold text-sm uppercase tracking-widest">Enter details to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
