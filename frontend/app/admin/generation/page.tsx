'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card'; // Assuming Card exists or using div
import { Loader2, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api'; // Assuming generic api wrapper
import { toast } from 'sonner';

export default function GenerationPage() {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5); // per difficulty
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!topic) return toast.error("Please enter a topic");
    
    setLoading(true);
    setResult(null);
    try {
      // Assuming api.post is available
      const res = await api.post('/generation/pool/bulk', {
        topic,
        count: Number(count),
        difficulties: ['EASY', 'MEDIUM', 'HARD']
      });
      
      setResult(res.data.details);
      toast.success("Generation completed!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Zap className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Question Generator
          </h1>
          <p className="text-muted-foreground">
            Bulk generate unique coding questions using AI to populate the adaptive pool.
          </p>
        </div>
      </div>

      <div className="grid gap-6 p-6 border rounded-xl bg-card shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Topic</label>
            <Input 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              placeholder="e.g. Binary Trees, Graph Algorithms, SQL Joins" 
              className="text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Questions per Difficulty Level</label>
            <Input 
              type="number" 
              value={count} 
              onChange={(e) => setCount(Number(e.target.value))} 
              min={1} 
              max={20}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Generating {count} Easy, {count} Medium, and {count} Hard questions. 
              Total: {count * 3} questions.
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={loading || !topic}
            className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Questions via AI...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Generate Question Pool
              </>
            )}
          </Button>
        </div>
      </div>

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-800 font-medium">Successfully Generated</p>
                <p className="text-2xl font-bold text-green-700">{result.success}</p>
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-800 font-medium">Failed</p>
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
              </div>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="p-4 border rounded-lg bg-gray-50 text-sm space-y-2">
              <p className="font-semibold text-gray-700">Error Log:</p>
              <ul className="list-disc pl-5 text-red-600 font-mono">
                {result.errors.map((e: string, i: number) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
