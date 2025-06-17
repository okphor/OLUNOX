import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export function useWebRTC(socket?: Socket | null, gameId?: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      console.log('Local stream started');
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const createPeerConnection = useCallback((peerId: string) => {
    console.log('Creating peer connection for:', peerId);
    
    // Close existing connection if it exists
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc) {
      existingPc.close();
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, 'for peer:', peerId);
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, event.track.kind);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log('Setting remote stream for:', peerId, 'stream ID:', remoteStream.id);
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(peerId, remoteStream);
          console.log('Updated remote streams map, now has:', Array.from(newMap.keys()));
          return newMap;
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && gameId) {
        console.log('Sending ICE candidate to:', peerId);
        socket.emit('webrtc-ice-candidate', {
          gameId,
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.log('Connection failed, attempting to restart for:', peerId);
        // Don't immediately remove, let ICE restart handle it
      } else if (pc.connectionState === 'disconnected') {
        console.log('Connection disconnected for:', peerId);
      } else if (pc.connectionState === 'connected') {
        console.log('Successfully connected to:', peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed for:', peerId);
        removePeerConnection(peerId);
      }
    };

    peerConnections.current.set(peerId, pc);
    
    // Process any pending ICE candidates
    const pending = pendingCandidates.current.get(peerId);
    if (pending && pending.length > 0) {
      console.log('Processing', pending.length, 'pending ICE candidates for:', peerId);
      pending.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      pendingCandidates.current.delete(peerId);
    }
    
    return pc;
  }, [localStream, socket, gameId]);

  const removePeerConnection = useCallback((peerId: string) => {
    console.log('Removing peer connection for:', peerId);
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    pendingCandidates.current.delete(peerId);
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  const initiateCall = useCallback(async (peerId: string) => {
    if (!socket || !gameId || !localStream) {
      console.log('Cannot initiate call - missing requirements:', { socket: !!socket, gameId, localStream: !!localStream });
      return;
    }

    console.log('Initiating call to:', peerId);
    const pc = createPeerConnection(peerId);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      
      console.log('Sending offer to:', peerId);
      socket.emit('webrtc-offer', {
        gameId,
        targetId: peerId,
        offer: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      removePeerConnection(peerId);
    }
  }, [socket, gameId, localStream, createPeerConnection, removePeerConnection]);

  const establishConnections = useCallback(async (peerIds: string[]) => {
    if (!socket || !gameId || !localStream || peerIds.length === 0) {
      console.log('Cannot establish connections - missing requirements');
      return;
    }

    console.log('Establishing connections with peers:', peerIds);
    
    // Add a small delay to ensure all peers are ready
    setTimeout(() => {
      peerIds.forEach(peerId => {
        if (!peerConnections.current.has(peerId)) {
          initiateCall(peerId);
        }
      });
    }, 500);
  }, [socket, gameId, localStream, initiateCall]);

  const handleOffer = useCallback(async (from: string, offer: RTCSessionDescriptionInit) => {
    if (!socket || !gameId || !localStream) {
      console.log('Cannot handle offer - missing requirements');
      return;
    }

    console.log('Handling offer from:', from);
    const pc = createPeerConnection(from);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer to:', from);
      socket.emit('webrtc-answer', {
        gameId,
        targetId: from,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      removePeerConnection(from);
    }
  }, [socket, gameId, localStream, createPeerConnection, removePeerConnection]);

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer from:', from);
    const pc = peerConnections.current.get(from);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Answer set successfully for:', from);
      } catch (error) {
        console.error('Error handling answer:', error);
        removePeerConnection(from);
      }
    } else {
      console.warn('No peer connection found for answer from:', from);
    }
  }, [removePeerConnection]);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate from:', from);
    const pc = peerConnections.current.get(from);
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added for:', from);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      // Store candidate for later if peer connection isn't ready
      console.log('Storing ICE candidate for later, peer connection not ready:', from);
      const pending = pendingCandidates.current.get(from) || [];
      pending.push(candidate);
      pendingCandidates.current.set(from, pending);
    }
  }, []);

  // Set up WebRTC signaling listeners
  useEffect(() => {
    if (!socket) return;

    console.log('Setting up WebRTC signaling listeners');

    const onOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      handleOffer(from, offer);
    };

    const onAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      handleAnswer(from, answer);
    };

    const onIceCandidate = ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      handleIceCandidate(from, candidate);
    };

    socket.on('webrtc-offer', onOffer);
    socket.on('webrtc-answer', onAnswer);
    socket.on('webrtc-ice-candidate', onIceCandidate);

    return () => {
      socket.off('webrtc-offer', onOffer);
      socket.off('webrtc-answer', onAnswer);
      socket.off('webrtc-ice-candidate', onIceCandidate);
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up WebRTC connections');
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      pendingCandidates.current.clear();
    };
  }, [localStream]);

  return {
    localStream,
    remoteStreams,
    videoEnabled,
    audioEnabled,
    startLocalStream,
    toggleVideo,
    toggleAudio,
    createPeerConnection,
    removePeerConnection,
    initiateCall,
    establishConnections
  };
}