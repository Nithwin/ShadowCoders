import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { api } from '@/lib/api';
import { Plus, Video, Calendar, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  type: z.enum(['INSTANT', 'SCHEDULED']),
});

type FormData = z.infer<typeof schema>;

export function CreateMeetingDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'INSTANT' | 'SCHEDULED'>('SCHEDULED');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'SCHEDULED'
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      let dateTime = new Date();
      
      if (type === 'SCHEDULED' && data.date && data.time) {
         dateTime = new Date(`${data.date}T${data.time}`);
         
         // Validate that date is in the future
         if (dateTime < new Date()) {
           setError('Please select a future date and time');
           return;
         }
      } else {
         // Instant meeting: set to now
         dateTime = new Date();
      }
      
      const response = await api.post('/meetings', {
        title: data.title,
        description: data.description,
        date: dateTime.toISOString(),
      });
      
      reset();
      setOpen(false);
      setError(null);
      onCreated();

      if (type === 'INSTANT' && response.data.data?.id) {
        router.push(`/meet/${response.data.data.id}`);
      }

    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      setError(error.response?.data?.message || 'Failed to create meeting');
    }
  };

  const setMeetingType = (newType: 'INSTANT' | 'SCHEDULED') => {
    setType(newType);
    setValue('type', newType);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md border-0 transition-all hover:scale-105">
          <Plus className="mr-2 h-4 w-4" />
          New Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
        
        {/* Compact Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 px-5 py-4 text-white relative overflow-hidden">
           {/* Subtle decorative elements */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-16 -translate-y-16 blur-3xl pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full -translate-x-8 translate-y-8 blur-2xl pointer-events-none" />
           
           <DialogHeader>
             <DialogTitle className="text-base font-bold flex items-center gap-2.5 relative z-10">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm transition-all duration-300 ${
                  type === 'INSTANT' ? 'bg-amber-400/25 text-amber-200 ring-2 ring-amber-300/30' : 'bg-white/15 text-white ring-2 ring-white/20'
                }`}>
                   {type === 'INSTANT' ? (
                      <Video className="h-4 w-4 drop-shadow-sm" />
                   ) : (
                      <Calendar className="h-4 w-4 drop-shadow-sm" />
                   )}
                </div>
               <span className="text-white tracking-tight">Create New Meeting</span>
             </DialogTitle>
           </DialogHeader>
        </div>

        <div className="p-5 bg-background">
          {/* Type Selector - Modern Toggle */}
          <div className="flex gap-2 mb-5">
             <button
               type="button"
               onClick={() => setMeetingType('SCHEDULED')}
               className={`
                 flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all duration-300 border-2
                 ${type === 'SCHEDULED' 
                   ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]" 
                   : "bg-background text-muted-foreground border-border hover:border-indigo-300 hover:bg-secondary/50"}
               `}
             >
                <Calendar className="h-4 w-4" />
                <span>Schedule</span>
             </button>
             <button
               type="button"
               onClick={() => setMeetingType('INSTANT')}
               className={`
                 flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all duration-300 border-2
                 ${type === 'INSTANT' 
                   ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-transparent shadow-md shadow-violet-500/20 scale-[1.02]" 
                   : "bg-background text-muted-foreground border-border hover:border-violet-300 hover:bg-secondary/50"}
               `}
             >
                <Video className={`h-4 w-4 ${type === 'INSTANT' ? "" : ""}`} />
                <span>Instant</span>
             </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 px-3 py-2.5 rounded-lg text-xs border border-red-200 dark:border-red-800/50 flex gap-2 items-start animate-in slide-in-from-top-2 fade-in">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Title</label>
              <Input 
                {...register('title')} 
                placeholder={type === 'INSTANT' ? "Quick Sync" : "Weekly Math Review"}
                className="h-10 bg-secondary/50 focus:bg-background border-border hover:border-indigo-300 transition-all focus:ring-2 focus:ring-indigo-500/20 text-sm rounded-lg"
              />
              {errors.title && <span className="text-red-500 text-[10px] ml-1 font-medium">{errors.title.message}</span>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Description <span className="text-muted-foreground/50">(Optional)</span></label>
              <Textarea 
                {...register('description')} 
                placeholder={type === 'INSTANT' ? "Quick discussion..." : "Agenda and topics for this meeting"}
                className="min-h-[70px] bg-secondary/50 focus:bg-background border-border hover:border-indigo-300 resize-none transition-all focus:ring-2 focus:ring-indigo-500/20 text-sm rounded-lg"
              />
            </div>

            {type === 'SCHEDULED' && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Date</label>
                  <Input 
                    type="date" 
                    {...register('date')}
                    className="h-10 bg-secondary/50 focus:bg-background border-border hover:border-indigo-300 text-sm rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Time</label>
                  <Input 
                     type="time" 
                     {...register('time')}
                     className="h-10 bg-secondary/50 focus:bg-background border-border hover:border-indigo-300 text-sm rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="pt-1">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className={`
                  w-full h-11 text-sm font-bold shadow-lg transition-all duration-300 rounded-xl
                  ${type === 'INSTANT' 
                    ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-700 hover:via-violet-700 hover:to-purple-700 text-white hover:shadow-violet-500/30 hover:scale-[1.02]"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/30 hover:scale-[1.02]"}
                `}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                     <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Creating...
                  </div> 
                ) : type === 'INSTANT' ? (
                  <span className="flex items-center justify-center text-white">
                    <Video className="mr-2 h-4 w-4" /> Start Instant Meeting
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Calendar className="mr-2 h-4 w-4" /> Schedule Meeting
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
