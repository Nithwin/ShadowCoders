'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Copy, FileJson, Check, ClipboardCopy, RefreshCw } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { buildSystemPrompt } from '@/lib/ai-prompt';
import { copyToClipboard } from '@/lib/utils';
import { useToastNotification } from '@/context/ToastContext';

// Reusing the same schema for params
const manualGenerationSchema = z.object({
  topic: z.string().min(3, 'A topic is required'),
  mcqCount: z.coerce.number().int().min(0).default(0),
  codingCount: z.coerce.number().int().min(0).default(0),
  sqlCount: z.coerce.number().int().min(0).default(0),
  essayCount: z.coerce.number().int().min(0).default(0),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'ANY']).default('ANY'),
  points: z.coerce.number().int().positive().optional(),
});

interface ManualAiGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionsGenerated: (questions: Array<Record<string, unknown>>) => Promise<void>;
}

export default function ManualAiGenerationModal({
  open,
  onOpenChange,
  onQuestionsGenerated,
}: ManualAiGenerationModalProps) {
  const toast = useToastNotification();
  const [apiError, setApiError] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [pastedJson, setPastedJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    watch,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(manualGenerationSchema),
    defaultValues: {
      topic: '',
      mcqCount: 0,
      codingCount: 0,
      sqlCount: 0,
      essayCount: 0,
      difficulty: 'ANY' as const,
      points: undefined,
    },
  });

  const handleModalChange = (open: boolean) => {
    if (!open) {
      reset();
      setApiError(null);
      setGeneratedPrompt('');
      setPastedJson('');
    }
    onOpenChange(open);
  };

  const currentValues = watch();

  const handleGeneratePrompt = () => {
    const data = currentValues;
    if (data.mcqCount === 0 && data.codingCount === 0 && data.sqlCount === 0 && data.essayCount === 0) {
      setApiError('Please select at least one question type.');
      return;
    }

    const prompt = buildSystemPrompt({
      topic: data.topic || '',
      mcqCount: Number(data.mcqCount) || 0,
      codingCount: Number(data.codingCount) || 0,
      sqlCount: Number(data.sqlCount) || 0,
      essayCount: Number(data.essayCount) || 0,
      difficulty: data.difficulty || 'ANY',
      points: data.points ? Number(data.points) : undefined
    });

    setGeneratedPrompt(prompt);
    setApiError(null);
  };

  const handleCopyPrompt = async () => {
    const success = await copyToClipboard(generatedPrompt);
    if (success) {
      setCopied(true);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  const handleParseAndSave = async () => {
    if (!pastedJson.trim()) {
      setApiError('Please paste the JSON response first.');
      return;
    }

    setIsProcessing(true);
    setApiError(null);

    try {
      let cleanedResponse = pastedJson.trim();

      // Remove Markdown code blocks if present
      if (cleanedResponse.startsWith('```')) {
        const lines = cleanedResponse.split('\n');
        // Remove first line (```json or ```)
        lines.shift();
        // Remove last line (```)
        if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        cleanedResponse = lines.join('\n').trim();
      }

      // Locate JSON object if surrounded by text
      const start = cleanedResponse.indexOf('{');
      const end = cleanedResponse.lastIndexOf('}');
      if (start !== -1 && end > start) {
        cleanedResponse = cleanedResponse.substring(start, end + 1);
      }

      const parsed = JSON.parse(cleanedResponse);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid JSON format: missing "questions" array.');
      }

      if (parsed.questions.length === 0) {
        throw new Error('No questions found in the JSON.');
      }

      // Send to parent for saving (DB persistence)
      await onQuestionsGenerated(parsed.questions);

      // Close modal on success
      handleModalChange(false);

    } catch (err: any) {
      console.error(err);
      setApiError('Parsing failed: ' + err.message + '. Check your pasted JSON.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleModalChange} title="Generate with Prompt (Manual)" size="lg">
      <div className="space-y-6">

        {/* Step 1: Configuration */}
        <div className="space-y-4 border-b border-primary/10 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">1. Configure Requirements</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Topic <span className="text-red-500">*</span></label>
            <Input
              {...register('topic')}
              placeholder="e.g. Java Loops, SQL Joins"
            />
            {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic.message}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">MCQs</label>
              <Input type="number" min={0} {...register('mcqCount')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">Coding</label>
              <Input type="number" min={0} {...register('codingCount')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">SQL</label>
              <Input type="number" min={0} {...register('sqlCount')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">Essay</label>
              <Input type="number" min={0} {...register('essayCount')} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">Difficulty</label>
              <select {...register('difficulty')} className="flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="ANY">Any</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-primary/70 mb-1">Points (Optional)</label>
              <Input type="number" min={1} {...register('points')} placeholder="Auto" />
            </div>
          </div>

          <Button type="button" onClick={handleGeneratePrompt} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Prompt Text
          </Button>
        </div>

        {/* Step 2: Copy Prompt */}
        {generatedPrompt && (
          <div className="space-y-2 border-b border-primary/10 pb-6 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-semibold text-primary flex items-center justify-between">
              <span>2. Copy Prompt to AI</span>
              <Button size="sm" variant="outline" onClick={handleCopyPrompt} className="h-8">
                {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </h3>
            <p className="text-xs text-primary/60">
              Paste this into Gemini (browser), ChatGPT, or Claude. It contains the schema instructions.
            </p>
            <div className="relative">
              <textarea
                readOnly
                value={generatedPrompt}
                className="w-full h-24 p-2 text-xs font-mono bg-black/5 rounded border border-primary/20 resize-none focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Paste & Parse */}
        {generatedPrompt && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-semibold text-primary">3. Paste AI Response & Save</h3>
            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder="Paste the JSON response from the AI here..."
              className="w-full h-32 p-3 text-sm bg-white/5 rounded border border-primary/20 focus:ring-accent/50 focus:border-accent font-mono"
            />

            {apiError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                {apiError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handleModalChange(false)}>Cancel</Button>
              <Button
                onClick={handleParseAndSave}
                disabled={!pastedJson.trim() || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? 'Processing...' : (
                  <>
                    <FileJson className="w-4 h-4 mr-2" />
                    Parse & Save Questions
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
