
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Mic, Square } from 'lucide-react';

interface MeetingRecorderProps {
  roomId: string;
}

export const MeetingRecorder = ({ roomId }: MeetingRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        // In a real app, upload this blob to backend
        console.log('Recording stopped, blob size:', blob.size);
        alert('Meeting recording saved! In production, this would be sent to the AI service for summarization.');
        
        // Mock upload
        // const formData = new FormData();
        // formData.append('audio', blob);
        // await fetch(`/api/meetings/${roomId}/upload-audio`, { method: 'POST', body: formData });
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={stopRecording}
          className="animate-pulse flex items-center gap-2"
        >
          <Square className="w-4 h-4" />
          Stop & Summarize
        </Button>
      ) : (
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={startRecording}
          className="flex items-center gap-2"
        >
          <Mic className="w-4 h-4" />
          Record for AI Summary
        </Button>
      )}
    </div>
  );
};
