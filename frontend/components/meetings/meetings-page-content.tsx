'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Meeting } from '@/types/meeting';
import { useAuth } from '@/context/AuthContext';
import { CreateMeetingDialog } from '@/components/meetings/create-meeting-dialog';
import { MeetingCard } from '@/components/meetings/meeting-card';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function MeetingsPageContent() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const fetchMeetings = async () => {
    try {
      setError(null);
      const { data } = await api.get('/meetings');
      if (data.success) {
        setMeetings(data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch meetings:', error);
      setError(error.response?.data?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Meetings & Sessions
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg">
            Join upcoming classes, reviews, and explore AI-generated summaries.
          </p>
        </div>
        {isAdminOrStaff && (
          <div className="shrink-0">
             <CreateMeetingDialog onCreated={fetchMeetings} />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-600 font-medium">{error}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchMeetings}
              className="mt-2 border-red-500/30 hover:bg-red-500/10"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-base text-muted-foreground">Loading sessions...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border-2 border-dashed border-secondary/50 px-4">
          <p className="text-xl font-medium text-muted-foreground">No meetings scheduled yet.</p>
          <p className="text-sm text-muted-foreground/80 mt-2">Check back later or ask your instructor.</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} onUpdate={fetchMeetings} />
          ))}
        </div>
      )}
    </div>
  );
}
