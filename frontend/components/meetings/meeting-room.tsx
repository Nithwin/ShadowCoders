import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebRTC } from '@/hooks/useWebRTC';
import { VideoPlayer } from './video-player';
import { MeetingRecorder } from './meeting-recorder';
import { Button } from '@/components/ui/Button';
import { PhoneOff, Mic, Video, Share, MicOff, VideoOff, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReactionDisplay {
  id: string;
  emoji: string;
  timestamp: number;
}

export default function MeetingRoom({ roomId }: { roomId: string }) {
  const { peers, localStream, socketConnected, shareScreen, messages, sendMessage, socket } = useWebRTC(roomId);
  const userVideoGrid = useRef<HTMLVideoElement>(null);
  const userVideoSpotlight = useRef<HTMLVideoElement>(null);
  const userVideoSidebar = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [reactions, setReactions] = useState<ReactionDisplay[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Check for getUserMedia support
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError('Camera/Microphone access requires HTTPS connection. Please access this page via HTTPS or localhost.');
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatOpen]);

  // Update video elements when stream changes
  useEffect(() => {
    if (localStream) {
      // Update grid video
      if (userVideoGrid.current) {
        userVideoGrid.current.srcObject = localStream;
      }
      // Update spotlight video
      if (userVideoSpotlight.current) {
        userVideoSpotlight.current.srcObject = localStream;
      }
      // Update sidebar video
      if (userVideoSidebar.current) {
        userVideoSidebar.current.srcObject = localStream;
      }
    }
  }, [localStream]);

  // Listen for reaction events
  useEffect(() => {
    if (!socket) return;

    const handleReaction = (payload: { reaction: string; roomId: string }) => {
      const newReaction: ReactionDisplay = {
        id: Math.random().toString(36).substr(2, 9),
        emoji: payload.reaction,
        timestamp: Date.now(),
      };
      
      setReactions((prev) => [...prev, newReaction]);
      
      // Auto-remove reaction after 3 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3000);
    };

    socket.on('receive-reaction', handleReaction);

    return () => {
      socket.off('receive-reaction', handleReaction);
    };
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all video tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.error('Error stopping track:', error);
          }
        });
      }
      if (reactionTimeoutRef.current) {
        clearTimeout(reactionTimeoutRef.current);
      }
    };
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const newState = !audioEnabled;
      localStream.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
      setAudioEnabled(newState);
    }
  }, [localStream, audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const newState = !videoEnabled;
      localStream.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
      setVideoEnabled(newState);
    }
  }, [localStream, videoEnabled]);

  const leaveMeeting = useCallback(() => {
    // Stop all tracks before leaving
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping track on leave:', error);
        }
      });
    }
    
    // Disconnect socket if connected
    if (socket?.connected) {
      socket.disconnect();
    }
    
    router.push('/admin/meetings');
  }, [localStream, socket, router]);

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (msgText.trim()) {
      sendMessage(msgText);
      setMsgText('');
    }
  }, [msgText, sendMessage]);

  const handleReactionClick = useCallback((emoji: string) => {
    if (socket) {
      socket.emit('send-reaction', { roomId, reaction: emoji });
      
      // Show local reaction immediately
      const newReaction: ReactionDisplay = {
        id: Math.random().toString(36).substr(2, 9),
        emoji: emoji,
        timestamp: Date.now(),
      };
      
      setReactions((prev) => [...prev, newReaction]);
      
      // Auto-remove reaction after 3 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3000);
    }
    setShowReactionPicker(false);
  }, [socket, roomId]); 

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showReactionPicker && !(e.target as HTMLElement).closest('[data-reaction-picker]')) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionPicker]);

  if (!socketConnected) {
     return (
       <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white space-y-4">
         <div className="w-16 h-16 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
         <p className="text-zinc-400 animate-pulse">Joining meeting room...</p>
       </div>
     );
  }

  // Show error if getUserMedia not supported
  if (mediaError) {
    return (
      <div className="fixed inset-0 z-50 w-full h-full bg-black flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <VideoOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Media Access Error</h2>
          <p className="text-muted-foreground mb-6">{mediaError}</p>
          <Button onClick={() => router.back()} variant="default">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-black overflow-hidden flex flex-col">
       {/* Reaction Overlay */}
       {reactions.length > 0 && (
         <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
           {reactions.map((reaction) => (
             <div
               key={reaction.id}
               className="absolute text-6xl sm:text-7xl md:text-8xl animate-bounce-in"
               style={{
                 animation: 'reactionPop 0.5s ease-out forwards',
                 left: `${50 + (Math.random() - 0.5) * 30}%`,
                 top: `${50 + (Math.random() - 0.5) * 20}%`,
               }}
             >
               {reaction.emoji}
             </div>
           ))}
         </div>
       )}

       {/* Main Content */}
       <div className="flex-1 flex flex-col relative h-full bg-black">
           
           {/* Meeting Info Badge (Top Left) - Responsive */}
           <div className="absolute top-2 left-2 sm:top-4 sm:left-4 md:top-6 md:left-6 z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 max-w-[calc(100%-1rem)] sm:max-w-none">
              <div className="bg-black/40 backdrop-blur-md border border-white/5 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-white/90 text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2">
                 <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
                 <span className="truncate max-w-[120px] sm:max-w-none">{roomId}</span>
                 <span className="text-white/30 hidden sm:inline">|</span>
                 <span className="text-white/60 text-xs sm:text-sm">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
              </div>
              
              {/* AI Recorder - Hidden on very small screens */}
              <div className="hidden xs:block">
                <MeetingRecorder roomId={roomId} />
              </div>
           </div>

           {/* Video Grid / Spotlight Layout */}
           <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 relative pb-20 sm:pb-24">
              {/* Layout Controls - Responsive */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-4 md:right-8 z-30 flex gap-1 sm:gap-2">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setLayoutMode('grid')}
                   className={`h-8 w-8 sm:h-9 sm:w-9 ${layoutMode === 'grid' ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/50 hover:text-white'}`}
                   title="Grid View"
                 >
                   <div className="grid grid-cols-2 gap-0.5 w-3 h-3 sm:w-4 sm:h-4">
                     <div className="bg-current rounded-[1px]" />
                     <div className="bg-current rounded-[1px]" />
                     <div className="bg-current rounded-[1px]" />
                     <div className="bg-current rounded-[1px]" />
                   </div>
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setLayoutMode('spotlight')}
                    className={`h-8 w-8 sm:h-9 sm:w-9 ${layoutMode === 'spotlight' ? 'bg-indigo-600/20 text-indigo-400' : 'text-white/50 hover:text-white'}`}
                    title="Spotlight View"
                 >
                   <div className="flex flex-col gap-0.5 w-3 h-3 sm:w-4 sm:h-4">
                     <div className="bg-current rounded-[1px] h-2.5 w-full" />
                     <div className="flex gap-0.5 h-1">
                        <div className="bg-current rounded-[1px] w-full" />
                        <div className="bg-current rounded-[1px] w-full" />
                     </div>
                   </div>
                 </Button>
              </div>

              {/* Grid Mode */}
              {layoutMode === 'grid' && (
                <div className={`
                  grid gap-2 sm:gap-3 md:gap-4 w-full h-full max-h-full transition-all duration-500 ease-in-out
                  ${peers.length === 0 ? 'grid-cols-1 max-w-5xl mx-auto' : 
                    peers.length === 1 ? 'grid-cols-1 sm:grid-cols-2 max-w-7xl mx-auto' : 
                    peers.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-7xl mx-auto' :
                    peers.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto' :
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-[1920px] mx-auto'}
                `}>
                   {/* My Video */}
                   <div className="relative bg-zinc-900 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl ring-1 ring-white/5 group/video flex items-center justify-center w-full h-full min-h-[200px] sm:min-h-[300px]">
                      <video 
                        playsInline 
                        muted 
                        ref={userVideoGrid} 
                        autoPlay={true}
                        controls={false}
                        className="w-full h-full object-cover transform scale-x-[-1]" 
                      />
                      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-white flex items-center gap-1.5 sm:gap-2 shadow-lg z-20 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        You {(!audioEnabled) && <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />}
                      </div>
                   </div>

                   {/* Remote Videos */}
                   {peers.map((peer, index) => (
                     <VideoPlayer 
                        key={peer.peerId} 
                        peerNode={peer} 
                        onPin={() => {
                           setPinnedPeerId(peer.peerId);
                           setLayoutMode('spotlight');
                        }}
                     />
                   ))}
                   
                   {/* Empty State */}
                   {peers.length === 0 && (
                      <div className="hidden lg:flex flex-col items-center justify-center text-white/30 space-y-4 animate-in fade-in duration-700">
                         <p className="text-xl font-light tracking-wide">Ready to connect</p>
                      </div>
                   )}
                </div>
              )}

              {/* Spotlight Mode */}
              {layoutMode === 'spotlight' && (
                 <div className="flex flex-col sm:flex-row w-full h-full gap-2 sm:gap-4">
                    {/* Main Spotlight Video */}
                    <div className="flex-1 bg-zinc-900 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/10 relative shadow-2xl min-h-[300px] sm:min-h-0">
                       {pinnedPeerId ? (
                          (() => {
                             const pinnedPeer = peers.find(p => p.peerId === pinnedPeerId);
                             return pinnedPeer ? (
                                <VideoPlayer peerNode={pinnedPeer} isPinned={true} onPin={() => { setPinnedPeerId(null); setLayoutMode('grid'); }} />
                             ) : (
                                <div className="flex items-center justify-center h-full text-white/40 text-sm sm:text-base bg-black/50">Peer disconnected</div>
                             );
                          })()
                       ) : (
                          <div className="relative w-full h-full group">
                            <video 
                              playsInline 
                              muted 
                              ref={userVideoSpotlight} 
                              autoPlay={true}
                              controls={false}
                              className="w-full h-full object-cover transform scale-x-[-1]" 
                            />
                            <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                               <Button size="sm" variant="secondary" onClick={() => setLayoutMode('grid')} className="text-xs sm:text-sm bg-black/60 backdrop-blur-md border border-white/20">
                                 Exit Spotlight
                               </Button>
                            </div>
                            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/80 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold text-white flex items-center gap-1.5 sm:gap-2 shadow-lg z-20 border border-white/10">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              You {(!audioEnabled) && <MicOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />}
                            </div>
                          </div>
                       )}
                    </div>

                    {/* Sidebar Strip - Responsive */}
                    {peers.length > 0 && (
                      <div className="w-full sm:w-48 md:w-64 flex flex-row sm:flex-col gap-2 sm:gap-3 overflow-x-auto sm:overflow-y-auto sm:overflow-x-hidden pb-2 sm:pb-0 pr-2 custom-scrollbar">
                         {/* Self in sidebar if pinned */}
                         {pinnedPeerId && (
                            <div className="shrink-0 aspect-video sm:w-full bg-zinc-800 rounded-lg overflow-hidden border border-white/5 relative">
                               <video 
                                 playsInline 
                                 muted 
                                 ref={userVideoSidebar} 
                                 autoPlay={true}
                                 controls={false}
                                 className="w-full h-full object-cover transform scale-x-[-1] bg-black" 
                               />
                               <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 text-[9px] sm:text-[10px] bg-black/60 px-1.5 sm:px-2 py-0.5 rounded text-white">You</div>
                            </div>
                         )}
                         
                         {/* Others */}
                         {peers.filter(p => p.peerId !== pinnedPeerId).map((peer) => (
                            <div key={peer.peerId} className="shrink-0 aspect-video sm:w-full cursor-pointer" onClick={() => setPinnedPeerId(peer.peerId)}>
                               <VideoPlayer peerNode={peer} onPin={() => setPinnedPeerId(peer.peerId)} />
                            </div>
                         ))}
                      </div>
                    )}
                 </div>
              )}
           </div>

           {/* Floating Controls Bar - Persistent & Responsive */}
           <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-auto max-w-[calc(100vw-2rem)] sm:max-w-[90vw]">
              <div className="bg-zinc-900/95 backdrop-blur-xl border-2 border-white/10 rounded-full flex items-center gap-1.5 sm:gap-2 md:gap-4 px-2 sm:px-4 md:px-8 py-2 sm:py-3 md:py-4 shadow-2xl ring-1 ring-white/5 transition-all hover:bg-zinc-800 hover:scale-[1.02] sm:hover:scale-105 hover:shadow-indigo-500/20 hover:border-indigo-500/30">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={`rounded-full w-10 h-10 sm:w-12 sm:h-12 transition-all duration-200 ${!audioEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    onClick={toggleAudio}
                    title={audioEnabled ? "Mute" : "Unmute"}
                  >
                    {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={`rounded-full w-10 h-10 sm:w-12 sm:h-12 transition-all duration-200 ${!videoEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    onClick={toggleVideo}
                    title={videoEnabled ? "Stop Video" : "Start Video"}
                  >
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>

                  <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 bg-white/10 hover:bg-indigo-500 hover:text-white text-white transition-all duration-200"
                    onClick={() => shareScreen()}
                    title="Share Screen"
                  >
                    <Share className="w-5 h-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-full w-10 h-10 sm:w-12 sm:h-12 transition-all duration-200 ${isChatOpen ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    title="Chat"
                  >
                     <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {messages.length > 0 && !isChatOpen && (
                           <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-zinc-900" />
                        )}
                     </div>
                  </Button>

                  {/* Emoji Reactions */}
                  <div className="relative" data-reaction-picker>
                     <Button
                       variant="ghost"
                       size="icon"
                       className={`rounded-full w-10 h-10 sm:w-12 sm:h-12 transition-all duration-200 ${
                         showReactionPicker 
                           ? 'bg-indigo-500 text-white' 
                           : 'bg-white/10 hover:bg-white/20 text-white'
                       }`}
                       title="React"
                       onClick={() => setShowReactionPicker(!showReactionPicker)}
                     >
                        <span className="text-lg">😊</span>
                     </Button>
                     
                     {/* Emoji Picker Popup */}
                     {showReactionPicker && (
                       <div 
                         className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-zinc-800/98 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-3 sm:p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
                         onMouseDown={(e) => e.preventDefault()}
                         data-reaction-picker
                       >
                        <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 justify-center w-64 sm:w-72">
                           {['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🔥'].map((emoji) => (
                              <button
                                 key={emoji}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleReactionClick(emoji);
                                 }}
                                 className="text-3xl sm:text-4xl hover:scale-150 active:scale-110 transition-all duration-200 hover:drop-shadow-xl cursor-pointer p-2 hover:bg-white/10 rounded-lg active:bg-white/20"
                                 title={`React with ${emoji}`}
                              >
                                 {emoji}
                              </button>
                           ))}
                        </div>
                     </div>
                     )}
                  </div>

                  <div className="w-px h-6 sm:h-8 bg-white/10 mx-0.5 sm:mx-1 hidden sm:block" />

                  <Button 
                    variant="destructive" 
                    className="rounded-full pl-3 pr-4 sm:pl-5 sm:pr-6 md:pl-6 md:pr-8 h-9 sm:h-10 md:h-12 bg-red-600 hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-500/20 text-xs sm:text-sm"
                    onClick={leaveMeeting}
                  >
                    <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 md:mr-3" />
                    <span className="font-semibold hidden sm:inline">End Call</span>
                  </Button>
              </div>
           </div>
       </div>

       {/* Chat Sidebar - Responsive */}
       <div className={`
         fixed top-0 sm:top-16 bottom-0 right-0 w-full sm:w-80 bg-zinc-900/98 sm:bg-zinc-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-transform duration-300 ease-in-out z-40 shadow-2xl
         ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
       `}>
          <div className="p-3 sm:p-5 border-b border-white/10 shrink-0 flex items-center justify-between">
             <h3 className="font-semibold text-white tracking-tight flex items-center gap-2 text-sm sm:text-base">
                <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                <span className="hidden sm:inline">In-Call Messages</span>
                <span className="sm:hidden">Messages</span>
             </h3>
             <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="h-8 w-8 text-white/50 hover:text-white">
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
             </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" ref={chatScrollRef}>
             {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-white/20">
                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                   </div>
                   <p className="text-xs sm:text-sm">No messages yet</p>
                </div>
             )}
             {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.isLocal ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                   <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl max-w-[85%] text-xs sm:text-[13px] shadow-sm leading-relaxed ${
                      m.isLocal 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-zinc-800 text-zinc-100 rounded-bl-none border border-white/5'
                   }`}>
                      <div className={`text-[9px] sm:text-[10px] uppercase font-bold mb-0.5 tracking-wider ${m.isLocal ? 'text-indigo-200' : 'text-zinc-500'}`}>
                         {m.sender}
                      </div>
                      {m.message}
                   </div>
                   <span className="text-[9px] sm:text-[10px] text-white/20 mt-0.5 sm:mt-1 px-1">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
             ))}
          </div>
          
          <div className="p-3 sm:p-4 border-t border-white/10 bg-black/20 shrink-0">
             <form onSubmit={handleSend} className="relative">
               <input 
                 className="w-full bg-zinc-800/50 border border-white/10 rounded-lg sm:rounded-xl pl-3 sm:pl-4 pr-10 sm:pr-12 py-2 sm:py-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 placeholder:text-white/20 transition-all"
                 placeholder="Type a message..."
                 value={msgText}
                 onChange={e => setMsgText(e.target.value)}
               />
               <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!msgText.trim()}
                  className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 h-7 w-7 sm:h-9 sm:w-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md sm:rounded-lg transition-all disabled:opacity-50 disabled:scale-90"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
               </Button>
             </form>
          </div>
       </div>
    </div>
  );
}
