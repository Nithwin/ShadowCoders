import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { useAuth } from '@/context/AuthContext';
import * as process from 'process';
import { Buffer } from 'buffer';
import { getApiBaseUrl } from '@/lib/api';

// Polyfills for simple-peer
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = process;
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

export interface PeerNode {
  peerId: string;
  peer: SimplePeer.Instance;
  userName?: string; // If we want to show names
}

export const useWebRTC = (roomId: string) => {
  const [peers, setPeers] = useState<PeerNode[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const socketRef = useRef<Socket>();
  const peersRef = useRef<{ peerId: string; peer: SimplePeer.Instance }[]>([]);
  const { user } = useAuth();
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // 1. Initialize Socket
    const apiUrl = getApiBaseUrl();
    const socketUrl = apiUrl.replace('/api', '');
    
    socketRef.current = io(socketUrl, {
       auth: {
         token: localStorage.getItem('accessToken')
       },
       reconnection: true,
       reconnectionAttempts: 5,
       reconnectionDelay: 1000,
    });

    const handleConnect = () => {
       if (isMounted) {
         console.log('Connected to signaling server');
         setSocketConnected(true);
       }
    };

    const handleDisconnect = () => {
       if (isMounted) {
         console.log('Disconnected from signaling server');
         setSocketConnected(false);
       }
    };

    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);

    // 2. Get User Media with error handling
    // Check if mediaDevices is available (HTTPS required on mobile)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('getUserMedia is not supported on this browser/context (HTTPS required)');
      if (isMounted) {
        setLocalStream(null);
        // Still connect to socket for chat-only mode
        socketRef.current?.emit('join-room', roomId);
      }
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setLocalStream(stream);

        // 3. Join Room
        socketRef.current?.emit('join-room', roomId);

        // 4. Listen for existing users
        const handleAllUsers = (users: { id: string; userName?: string }[]) => {
          if (!isMounted) return;
          console.log('All users in room:', users);
          const newPeers: { peerId: string; peer: SimplePeer.Instance }[] = [];

          users.forEach((userInfo) => {
            if (socketRef.current?.id && userInfo.id !== socketRef.current.id) {
              const peer = createPeer(userInfo.id, socketRef.current.id, stream);
              newPeers.push({ peerId: userInfo.id, peer });
            }
          });

          peersRef.current = newPeers;
          setPeers(newPeers);
        };

        // 5. Listen for new user joining
        const handleUserJoined = (payload: { signal: any; callerID: string; userName?: string }) => {
          if (!isMounted) return;
          console.log('User joined:', payload.callerID);
          
          // Check if peer already exists
          const existingPeer = peersRef.current.find(p => p.peerId === payload.callerID);
          if (existingPeer) {
            console.log('Peer already exists, ignoring duplicate');
            return;
          }
          
          const peer = addPeer(payload.signal, payload.callerID, stream);
          const newPeerNode = { peerId: payload.callerID, peer };
          peersRef.current.push(newPeerNode);
          setPeers((prev) => [...prev, newPeerNode]);
        };

        // 6. Listen for returned signal
        const handleReturnedSignal = (payload: { signal: any; id: string }) => {
          if (!isMounted) return;
          const item = peersRef.current.find((p) => p.peerId === payload.id);
          item?.peer.signal(payload.signal);
        };

        // 7. Listen for user disconnect
        const handleUserDisconnected = (userId: string) => {
          if (!isMounted) return;
          console.log('User disconnected:', userId);
          const peerObj = peersRef.current.find((p) => p.peerId === userId);
          if (peerObj) {
            try {
              peerObj.peer.destroy();
            } catch (error) {
              console.error('Error destroying peer on disconnect:', error);
            }
          }
          peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
          setPeers((prev) => prev.filter((p) => p.peerId !== userId));
        };

        socketRef.current?.on('all-users', handleAllUsers);
        socketRef.current?.on('user-joined', handleUserJoined);
        socketRef.current?.on('receiving-returned-signal', handleReturnedSignal);
        socketRef.current?.on('user-left', handleUserDisconnected); // Changed from 'user-disconnected'

        // Store handlers for cleanup
        (socketRef.current as any)._handlers = {
          handleAllUsers,
          handleUserJoined,
          handleReturnedSignal,
          handleUserDisconnected,
        };
      })
      .catch((error) => {
        console.error('Failed to get user media:', error);
        if (isMounted) {
          setLocalStream(null);
          // Still connect to socket for chat-only mode
          socketRef.current?.emit('join-room', roomId);
          setSocketConnected(true);
        }
      });

    return () => {
       isMounted = false;
       // Cleanup socket handlers
       const handlers = (socketRef.current as any)?._handlers;
       if (handlers) {
         socketRef.current?.off('all-users', handlers.handleAllUsers);
         socketRef.current?.off('user-joined', handlers.handleUserJoined);
         socketRef.current?.off('receiving-returned-signal', handlers.handleReturnedSignal);
         socketRef.current?.off('user-left', handlers.handleUserDisconnected); // Changed from 'user-disconnected'
       }
       socketRef.current?.off('connect', handleConnect);
       socketRef.current?.off('disconnect', handleDisconnect);
       
       // Disconnect socket
       if (socketRef.current?.connected) {
         socketRef.current.disconnect();
       }
       
       // Cleanup media streams
       if (localStream) {
         localStream.getTracks().forEach(track => {
           try {
             track.stop();
           } catch (e) {
             console.error('Error stopping track:', e);
           }
         });
       }
       
       // Cleanup peers
       peersRef.current.forEach(p => {
         try {
           p.peer.destroy();
         } catch (e) {
           console.error('Error destroying peer:', e);
         }
       });
       peersRef.current = [];
    }
  }, [roomId]);

  function createPeer(userToSignal: string, callerID: string, stream: MediaStream) {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('sending-signal', { userToSignal, callerID, signal });
    });

    peer.on('error', (err) => {
      console.error('Peer error (initiator):', err);
    });

    return peer;
  }

  function addPeer(incomingSignal: any, callerID: string, stream: MediaStream) {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('returning-signal', { signal, callerID });
    });

    peer.on('error', (err) => {
      console.error('Peer error (receiver):', err);
    });

    peer.signal(incomingSignal);

    return peer;
  }

  const shareScreen = async () => {
    try {
      // 1. Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      
      if (!screenTrack || !localStream) {
        console.error('No screen track or local stream available');
        return;
      }
      
      // 2. Replace video track for all peers
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        peersRef.current.forEach(({ peer }) => {
          try {
            // simple-peer replaceTrack signature: (oldTrack, newTrack, stream)
            peer.replaceTrack(videoTrack, screenTrack, localStream);
          } catch (error) {
            console.error('Error replacing track for peer:', error);
          }
        });
      }

      // 3. Update local view - keep audio, replace video
      const audioTracks = localStream.getAudioTracks();
      const newStream = new MediaStream([screenTrack, ...audioTracks]);
      setLocalStream(newStream);

      // 4. Handle stop sharing (user clicks browser "Stop Sharing" button)
      screenTrack.onended = () => {
         stopScreenShare();
      };

    } catch (error) {
       console.error("Error sharing screen:", error);
    }
  };

  const stopScreenShare = () => {
     // Revert to camera
     navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((camStream) => {
        const camTrack = camStream.getVideoTracks()[0];
        
        if (localStream && camTrack) {
            // Find current video track (which is screen)
             const currentVideoTrack = localStream.getVideoTracks()[0];
             if (currentVideoTrack) {
               currentVideoTrack.stop(); // Stop screen share
               
               peersRef.current.forEach(({ peer }) => {
                  try {
                    peer.replaceTrack(currentVideoTrack, camTrack, localStream);
                  } catch (error) {
                    console.error('Error replacing track back to camera:', error);
                  }
               });
             }
        }
        
        // Update local stream with camera
        const audioTracks = localStream?.getAudioTracks() || [];
        const newStream = new MediaStream([camTrack, ...audioTracks]);
        setLocalStream(newStream);
     }).catch(err => {
       console.error('Error reverting to camera:', err);
     });
  };

  // Chat State
  const [messages, setMessages] = useState<{ sender: string; message: string; isLocal: boolean }[]>([]);

  useEffect(() => {
    if (!socketRef.current) return;
    
    const handleChatMessage = (payload: { message: string; sender: string }) => {
      setMessages((prev) => [...prev, { sender: payload.sender, message: payload.message, isLocal: false }]);
    };
    
    socketRef.current.on('chat-message', handleChatMessage);
    
    return () => {
      socketRef.current?.off('chat-message', handleChatMessage);
    };
  }, [socketConnected]);

  const sendMessage = (text: string) => {
     if (text.trim() && socketRef.current) {
         const payload = { roomId, message: text, sender: user?.name || 'User' };
         socketRef.current.emit('chat-message', payload);
         setMessages((prev) => [...prev, { sender: 'You', message: text, isLocal: true }]);
     }
  };

  return {
    peers,
    localStream,
    socketConnected,
    shareScreen,
    messages,
    sendMessage,
    socket: socketRef.current
  };
};
