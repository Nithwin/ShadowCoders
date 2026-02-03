import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Meeting } from '@/types/meeting';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useConfirmationDialog } from '@/context/ConfirmationContext';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Calendar, Clock, Video, FileText, CheckCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';

export function MeetingCard({ meeting, onUpdate }: { meeting: Meeting; onUpdate: () => void }) {
  const { user } = useAuth();
  const { confirm } = useConfirmationDialog();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transcript, setTranscript] = useState(meeting.transcript || '');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHostOrAdmin = user?.id === meeting.hostId || user?.role === 'ADMIN' || user?.role === 'STAFF';
  const meetingDate = new Date(meeting.date);
  const now = new Date();
  
  // Consider meeting "active" if it's within 30 minutes before or 2 hours after scheduled time
  const thirtyMinutesBefore = new Date(meetingDate.getTime() - 30 * 60 * 1000);
  const twoHoursAfter = new Date(meetingDate.getTime() + 2 * 60 * 60 * 1000);
  const isActive = now >= thirtyMinutesBefore && now <= twoHoursAfter;
  const isPast = now > twoHoursAfter;
  
  const isJoined = meeting.participants?.some(p => p.user.email === user?.email);

  const handleJoin = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/meetings/${meeting.id}/join`);
      // Navigate to meeting room instead of opening external link
      window.location.href = `/meet/${meeting.id}`;
    } catch (error: any) {
      console.error('Failed to join:', error);
      setError(error.response?.data?.message || 'Failed to join meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/meetings/${meeting.id}/summarize`, { transcript });
      onUpdate();
      setSummaryOpen(false);
    } catch (error: any) {
      console.error('Failed to summarize:', error);
      setError(error.response?.data?.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    console.log('Delete clicked for meeting:', meeting.id);
    console.log('User:', user);
    console.log('isHostOrAdmin:', isHostOrAdmin);
    
    const confirmed = await confirm({
      title: 'Delete Meeting',
      message: `Are you sure you want to delete "${meeting.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    console.log('Confirmation result:', confirmed);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      console.log('Sending delete request to:', `/meetings/${meeting.id}`);
      const response = await api.delete(`/meetings/${meeting.id}`);
      console.log('Delete response:', response);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to delete:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.message || 'Failed to delete meeting');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative bg-card hover:bg-card/95 border border-border/50 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 h-full flex flex-col">
      {/* Decorative Header Gradient */}
      <div className={`h-24 w-full absolute top-0 left-0 bg-gradient-to-br ${
        meeting.status === 'COMPLETED' ? 'from-emerald-500/20 to-teal-500/5' :
        isPast ? 'from-gray-500/20 to-slate-500/5' : 'from-indigo-500/20 to-violet-500/5'
      }`} />

      {/* Content Container */}
      <div className="p-5 relative flex flex-col h-full">
        
        {/* Top Row: Date Badge & Status */}
        <div className="flex justify-between items-start mb-4">
           <div className="flex flex-col bg-background/90 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-1.5 text-center min-w-[3.5rem] shadow-sm">
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
                {meetingDate.toLocaleDateString(undefined, { month: 'short' })}
              </span>
              <span className="text-lg font-bold leading-none text-foreground">
                {meetingDate.getDate()}
              </span>
           </div>

           <div className="flex items-center gap-2">
             <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm backdrop-blur-md ${
              meeting.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
              isPast ? 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
             }`}>
              {meeting.status}
             </div>
             
             {/* Delete button for admin/staff */}
             {isHostOrAdmin && (
               <Button
                 size="sm"
                 variant="ghost"
                 onClick={handleDelete}
                 disabled={deleting}
                 className="h-7 w-7 p-0 hover:bg-red-500/10 hover:text-red-600 transition-colors"
                 title="Delete meeting"
               >
                 {deleting ? (
                   <Loader2 className="h-4 w-4 animate-spin" />
                 ) : (
                   <Trash2 className="h-4 w-4" />
                 )}
               </Button>
             )}
           </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Title & Host */}
        <div className="mb-4">
           <h3 className="text-lg font-bold tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {meeting.title}
           </h3>
           
           <div className="flex items-center gap-2 flex-wrap">
             <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                {meeting.host.name?.[0]?.toUpperCase() || 'U'}
             </div>
             <span className="text-sm text-muted-foreground truncate font-medium">
               {meeting.host.name}
             </span>
             {meeting._count?.participants !== undefined && (
               <>
                 <span className="text-muted-foreground/40">•</span>
                 <span className="text-xs text-muted-foreground flex items-center gap-1">
                   {meeting._count.participants} attending
                 </span>
               </>
             )}
           </div>
        </div>

        {/* Time & Description */}
        <div className="space-y-3 mb-6 flex-grow">
           <div className="flex items-center text-sm text-muted-foreground bg-secondary/40 p-2 rounded-lg border border-border/30">
             <Clock className="mr-2 h-4 w-4 text-primary/70 flex-shrink-0" />
             <span className="font-medium truncate">
               {meetingDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
               {' - '}
               {new Date(new Date(meeting.date).getTime() + 60*60*1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
             </span>
           </div>

           {meeting.description && (
             <p className="text-xs text-muted-foreground line-clamp-3 pl-1 leading-relaxed">
               {meeting.description}
             </p>
           )}
        </div>

        {/* Actions */}
        <div className="pt-3 mt-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-border/50">
           {/* Join Button - Show for active meetings */}
           {(isActive || meeting.status === 'SCHEDULED') && (
             <Button 
               size="sm" 
               onClick={() => window.open(`/meet/${meeting.id}`, '_blank')}
               disabled={loading} 
               variant={isJoined ? "outline" : "default"}
               className={`flex-1 font-medium shadow-sm transition-all text-sm ${!isJoined ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md hover:shadow-indigo-500/20" : ""}`}
             >
               {isJoined ? (
                 <>
                   <CheckCircle className="mr-2 h-3.5 w-3.5 text-green-500" />
                   Join Again
                 </>
               ) : (
                 <>
                   <Video className="mr-2 h-3.5 w-3.5" />
                   Join Now
                 </>
               )}
             </Button>
           )}

           {/* AI Summary Button */}
           {(isPast || meeting.status === 'COMPLETED') && (
             <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
               <DialogTrigger asChild>
                 <Button size="sm" variant="secondary" className="flex-1 bg-secondary hover:bg-secondary/80 border border-border/50 text-sm shadow-sm">
                   <FileText className="mr-2 h-3.5 w-3.5 text-violet-500" />
                   {meeting.summary ? 'View Summary' : 'AI Analysis'}
                 </Button>
               </DialogTrigger>
               <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                 <DialogHeader>
                   <DialogTitle className="flex items-center text-xl">
                     <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mr-3">
                        <span className="text-lg">✨</span>
                     </div>
                     Meeting Summary & Insights
                   </DialogTitle>
                 </DialogHeader>
                 
                 <div className="mt-6 space-y-6">
                   {meeting.summary ? (
                     <div className="prose prose-sm dark:prose-invert max-w-none bg-zinc-50/50 dark:bg-zinc-900/50 p-6 rounded-xl border border-border/50">
                        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{meeting.summary}</p>
                     </div>
                   ) : (
                     isHostOrAdmin ? (
                       <div className="space-y-4">
                         <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 p-4 rounded-xl text-sm border border-blue-100 dark:border-blue-500/20 flex gap-3">
                           <div className="shrink-0 mt-0.5">ℹ️</div>
                           <div>
                             <strong>Generate Insights:</strong> Paste the transcript below to let Gemini generate a concise summary and action items.
                           </div>
                         </div>
                         {error && (
                           <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm border border-red-100 dark:border-red-500/20 flex gap-3">
                             <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                             <span>{error}</span>
                           </div>
                         )}
                         <Textarea 
                           value={transcript}
                           onChange={(e) => setTranscript(e.target.value)}
                           placeholder="Paste transcript here..."
                           className="min-h-[200px] font-mono text-sm resize-y rounded-xl focus:ring-2 focus:ring-violet-500/20"
                         />
                         <div className="flex justify-end">
                           <Button 
                             onClick={handleGenerateSummary} 
                             disabled={loading || !transcript.trim()}
                             className="bg-violet-600 hover:bg-violet-700 text-white"
                           >
                             {loading ? (
                               <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                               </>
                             ) : (
                               <>
                                 <span className="mr-2">✨</span> Generate AI Summary
                               </>
                             )}
                           </Button>
                         </div>
                       </div>
                     ) : (
                       <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                          <FileText className="h-12 w-12 mb-3 opacity-20" />
                          <p>Summary has not been generated yet.</p>
                       </div>
                     )
                   )}
                 </div>
               </DialogContent>
             </Dialog>
           )}
        </div>
      </div>
    </div>
  );
}
