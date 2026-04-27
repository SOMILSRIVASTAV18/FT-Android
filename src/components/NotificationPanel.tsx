import React from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { AppNotification } from '../types';
import { db, doc, updateDoc, deleteDoc, writeBatch, collection } from '../lib/firebase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface NotificationPanelProps {
  notifications: AppNotification[];
  userId: string;
}

export function NotificationPanel({ notifications, userId }: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    if (!confirm('Clear all notifications?')) return;

    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });

    try {
      await batch.commit();
      toast.success('All notifications cleared');
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-primary/10 transition-colors">
          <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-primary")} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-none overflow-hidden border-none shadow-2xl glass">
        <div className="p-4 flex items-center justify-between bg-primary/5">
          <div>
            <h3 className="text-sm font-black tracking-tight">Notifications</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {unreadCount} unread messages
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10" onClick={markAllAsRead} title="Mark all as read">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive" onClick={clearAll} title="Clear all">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="p-3 bg-muted rounded-2xl mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">All caught up!</p>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-4 transition-colors hover:bg-accent/5 relative group",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "mt-0.5 p-1.5 rounded-lg h-fit",
                      notification.type === 'info' && "bg-blue-500/10",
                      notification.type === 'warning' && "bg-yellow-500/10",
                      notification.type === 'success' && "bg-green-500/10",
                      notification.type === 'error' && "bg-red-500/10"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black tracking-tight">{notification.title}</p>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2 bg-muted/30">
          <Button variant="ghost" className="w-full h-8 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5">
            View All Activity
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
