import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Mail, MessageCircle, Phone, LifeBuoy, ShieldCheck, ArrowLeftRight, Users, Zap, Star, Heart, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Help() {
  const faqs = [
    {
      question: "How do I add a family member?",
      answer: "Go to the 'Family' tab. If you haven't created a family yet, create one. Then share the unique 'Family Code' with your family members. They can join by entering this code in their own 'Family' tab."
    },
    {
      question: "Can I track my expenses in different currencies?",
      answer: "Yes! The default currency is INR (₹), but you can change it in the 'Settings' tab if needed."
    },
    
    {
      question: "Is my data backed up?",
      answer: "Your data is stored securely in the cloud. Additionally, you can manually export a full backup of your transactions from the 'Settings' tab at any time."
    },
    {
      question: "How do I set a budget?",
      answer: "Navigate to the 'Budgets' tab and click 'Set Budget'. Choose a category and a monthly limit. We'll alert you when you approach or exceed your limit."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
          <LifeBuoy className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-4xl font-black tracking-tight text-foreground dark:text-white">Help Center</h2>
        <p className="text-muted-foreground font-medium max-w-lg mx-auto">Everything you need to know about managing your finances with FinTrack Pro.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: LifeBuoy, label: "Getting Started", color: "text-blue-500", desc: "Basics of FinTrack" },
          { icon: ArrowLeftRight, label: "Transactions", color: "text-green-500", desc: "Manage your money" },
          { icon: Users, label: "Family Sharing", color: "text-purple-500", desc: "Collaborate together" },
          { icon: ShieldCheck, label: "Security", color: "text-red-500", desc: "Data protection" },
        ].map((cat, i) => (
          <Card key={i} className="border-none glass hover:bg-primary/5 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
              <div className={cn("p-4 rounded-2xl bg-current/10", cat.color)}>
                <cat.icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest block">{cat.label}</span>
                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">{cat.desc}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-black tracking-tight dark:text-white">Frequently Asked Questions</CardTitle>
              <CardDescription className="font-medium">Quick answers to common queries.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-b border-primary/5 last:border-0">
                    <AccordionTrigger className="text-left font-bold hover:text-primary transition-colors dark:text-white py-4">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground font-medium leading-relaxed pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-black tracking-tight dark:text-white">About FinTrack Pro</CardTitle>
              <CardDescription className="font-medium">Your personal financial companion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 text-sm font-medium leading-relaxed text-muted-foreground">
              <div className="space-y-4">
                <p>
                  FinTrack Pro is a comprehensive financial management tool designed to help you take control of your money. 
                  With features family sharing, and detailed budgeting, we make financial 
                  clarity accessible to everyone.
                </p>
                <p>
                  Our mission is to empower users with the tools they need to achieve their financial goals, 
                  whether it's saving for a dream home or simply managing daily expenses more effectively.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                {[
    
                  { icon: Users, title: "Family Sync", desc: "Collaborate on household budgets in real-time." },
                  { icon: ShieldCheck, title: "Secure", desc: "Bank-grade encryption for all your data." },
                  { icon: Star, title: "Insights", desc: "Detailed charts and reports for better decisions." }
                ].map((feature, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-foreground dark:text-white text-xs uppercase tracking-wider">{feature.title}</p>
                      <p className="text-[11px] leading-tight mt-1">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 space-y-4 border-t border-primary/10">
                <p className="font-black text-foreground dark:text-white text-xs uppercase tracking-widest">Our Story</p>
                <p className="text-xs leading-relaxed opacity-80">
                  FinTrack Pro started as a small project to help individuals take control of their financial destiny. 
                  Today, it's a comprehensive platform used by thousands to manage budgets, track expenses, and plan for the future.
                </p>
              </div>

              <div className="pt-8 flex items-center gap-5 border-t border-primary/10">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-foreground dark:text-white text-lg tracking-tight">Secure & Private</p>
                  <p className="text-xs max-w-md">Your data is encrypted and stored securely. We never sell your personal information. Your privacy is our top priority.</p>
                </div>
              </div>

              <div className="pt-8 flex items-center justify-between border-t border-primary/10">
                
              
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none glass shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-2xl font-black tracking-tight dark:text-white">Contact Support</CardTitle>
              <CardDescription className="font-medium">Need more help? Reach out to our team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 font-bold group" render={<a href="mailto:somilsrivastav18@gmail.com" />} nativeButton={false}>
                <div className="bg-blue-500/10 p-2 rounded-lg mr-3 group-hover:bg-blue-500/20 transition-colors">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <span className="truncate">somilsrivastav18@gmail.com</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 font-bold group" render={<a href="https://t.me/somilsrivastav_18" target="_blank" rel="noreferrer" />} nativeButton={false}>
                <div className="bg-sky-500/10 p-2 rounded-lg mr-3 group-hover:bg-sky-500/20 transition-colors">
                  <MessageCircle className="h-5 w-5 text-sky-600" />
                </div>
                <span>Telegram Support</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-14 rounded-2xl border-2 font-bold group" nativeButton={false}>
                <div className="bg-emerald-500/10 p-2 rounded-lg mr-3 group-hover:bg-emerald-500/20 transition-colors">
                  <Phone className="h-5 w-5 text-emerald-600" />
                </div>
                <span>+91 7376787697</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary text-primary-foreground shadow-xl rounded-[2.5rem] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                <Star className="h-5 w-5 fill-current" />
                Pro Tip
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium opacity-90 leading-relaxed">
              Use the 'Family' feature to synchronize your household budget. Any transaction marked as 'Shared' will be visible to all members instantly.
            </CardContent>
          </Card>

          <div className="glass p-6 rounded-[2.5rem] space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-center dark:text-white">System Status</h4>
            <div className="space-y-3">
              {[
                { label: "Cloud Sync", status: "Operational" },
               
                { label: "Family Hub", status: "Operational" }
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-500">{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
