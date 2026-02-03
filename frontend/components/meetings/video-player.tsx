import { useEffect, useRef, useState } from 'react';
import { PeerNode } from '@/hooks/useWebRTC';

export const VideoPlayer = ({ peerNode, isPinned, onPin }: { peerNode: PeerNode, isPinned?: boolean, onPin?: () => void }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const peer = peerNode.peer;
    
    const handleStream = (stream: MediaStream) => {
      if (ref.current && stream) {
        ref.current.srcObject = stream;
        setHasError(false);
      }
    };

    const handleError = (err: Error) => {
      console.error('Peer connection error:', err);
      setHasError(true);
    };

    peer.on('stream', handleStream);
    peer.on('error', handleError);

    // Cleanup
    return () => {
      peer.off('stream', handleStream);
      peer.off('error', handleError);
    };
  }, [peerNode]);

  return (
    <div className={`relative bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border-2 group transition-all duration-300 ${isPinned ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-500/20' : 'border-white/10 hover:border-white/30 hover:shadow-xl'}`}>
       {hasError ? (
         <div className="w-full h-full flex items-center justify-center bg-zinc-900 p-4 min-h-[200px]">
           <div className="text-center text-white/40">
             <div className="text-3xl mb-2">📹</div>
             <p className="text-sm">Connection issue</p>
           </div>
         </div>
       ) : (
         <video 
           playsInline 
           autoPlay={true}
           muted
           controls={false}
           ref={ref} 
           className="w-full h-full object-cover"
           onError={(e) => {
             console.error('Video playback error:', e);
             setHasError(true);
           }}
           onLoadedMetadata={() => setHasError(false)}
         />
       )}
       <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 sm:gap-2 border border-white/10 shadow-lg">
         <span className="w-2 h-2 rounded-full bg-green-500"></span>
         <span className="hidden sm:inline">User </span>
         {peerNode.userName || peerNode.peerId.slice(0, 4)}...
       </div>
       
       {/* Pin Button */}
       {onPin && (
         <button 
           onClick={(e) => { e.stopPropagation(); onPin(); }}
           className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg bg-black/80 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600 border border-white/10 shadow-lg"
           title={isPinned ? "Unpin" : "Pin"}
           aria-label={isPinned ? "Unpin video" : "Pin video"}
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isPinned ? "fill-white" : ""}><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
         </button>
       )}
    </div>
  );
};
