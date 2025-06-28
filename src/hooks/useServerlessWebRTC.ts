import { useEffect, useRef, useState, useCallback } from 'react';

export function useServerlessWebRTC(gameId?: string, playerId?: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef<Map<string, number>>(new Map());
  const pendingOffers = useRef<Set<string>>(new Set());
  const isInitiator = useRef<Map<string, boolean>>(new Map());
  const connectionStates = useRef<Map<string, string>>(new Map());
  const establishedConnections = useRef<Set<string>>(new Set());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const API_BASE = '/.netlify/functions';

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280, max: 1920 }, 
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      setLocalStream(stream);
      console.log('Local stream started:', stream.id, {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoSettings: stream.getVideoTracks()[0]?.getSettings(),
        audioSettings: stream.getAudioTracks()[0]?.getSettings()
      });
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
        console.log('Video toggled:', videoTrack.enabled);
        
        // Notify peers about video state change
        peerConnections.current.forEach((pc, peerId) => {
          const sender = pc.getSenders().find(s => s.track === videoTrack);
          if (sender) {
            console.log('Updated video track state for peer:', peerId);
          }
        });
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        console.log('Audio toggled:', audioTrack.enabled);
        
        // Notify peers about audio state change
        peerConnections.current.forEach((pc, peerId) => {
          const sender = pc.getSenders().find(s => s.track === audioTrack);
          if (sender) {
            console.log('Updated audio track state for peer:', peerId);
          }
        });
      }
    }
  };

  const sendSignalingMessage = async (type: string, to: string, payload: any) => {
    if (!gameId || !playerId) return;

    try {
      const response = await fetch(`${API_BASE}/webrtc-signaling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          gameId,
          from: playerId,
          to,
          payload
        })
      });

      if (!response.ok) {
        throw new Error(`Signaling failed: ${response.status}`);
      }
      console.log(`Sent ${type} to ${to}`);
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  };

  const pollSignalingMessages = useCallback(async () => {
    if (!gameId || !playerId) return;

    try {
      const response = await fetch(`${API_BASE}/webrtc-signaling?gameId=${gameId}&playerId=${playerId}`);
      if (response.ok) {
        const data = await response.json();
        
        for (const message of data.messages || []) {
          await handleSignalingMessage(message);
        }
      }
    } catch (error) {
      console.error('Error polling signaling messages:', error);
    }
  }, [gameId, playerId]);

  const handleSignalingMessage = async (message: any) => {
    const { type, from, payload } = message;

    // Prevent processing messages from ourselves
    if (from === playerId) {
      return;
    }

    console.log(`Handling ${type} from ${from}`);

    switch (type) {
      case 'offer':
        await handleOffer(from, payload);
        break;
      case 'answer':
        await handleAnswer(from, payload);
        break;
      case 'ice-candidate':
        await handleIceCandidate(from, payload);
        break;
    }
  };

  const createPeerConnection = (peerId: string, isInitiatingCall: boolean = false) => {
    // Check if we already have a working connection
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting')) {
      console.log('Already have working connection for:', peerId, 'state:', existingPc.connectionState);
      return existingPc;
    }

    console.log('Creating peer connection for:', peerId, 'as initiator:', isInitiatingCall);
    
    // Close existing connection if it exists
    if (existingPc) {
      console.log('Closing existing connection for:', peerId);
      existingPc.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind, 'enabled:', track.enabled, 'for peer:', peerId);
        const sender = pc.addTrack(track, localStream);
        console.log('Track added successfully, sender:', sender);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from:', peerId, {
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streamCount: event.streams.length
      });
      
      const [remoteStream] = event.streams;
      if (remoteStream && remoteStream.active) {
        console.log('Setting remote stream for:', peerId, {
          streamId: remoteStream.id,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
          active: remoteStream.active
        });
        
        // Ensure the stream has valid tracks
        const videoTracks = remoteStream.getVideoTracks();
        const audioTracks = remoteStream.getAudioTracks();
        
        if (videoTracks.length > 0 || audioTracks.length > 0) {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(peerId, remoteStream);
            console.log('Updated remote streams map for:', peerId, 'total streams:', newMap.size);
            return newMap;
          });

          // Log track details
          videoTracks.forEach(track => {
            console.log(`Video track from ${peerId}:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              settings: track.getSettings()
            });
          });
          
          audioTracks.forEach(track => {
            console.log(`Audio track from ${peerId}:`, {
              enabled: track.enabled,
              readyState: track.readyState,
              settings: track.getSettings()
            });
          });
        } else {
          console.warn('Remote stream has no tracks:', peerId);
        }
      } else {
        console.warn('Invalid remote stream received from:', peerId);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && gameId) {
        console.log('Sending ICE candidate to:', peerId, {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
        sendSignalingMessage('ice-candidate', peerId, event.candidate);
      } else if (!event.candidate) {
        console.log('ICE gathering complete for:', peerId);
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      const newState = pc.connectionState;
      const oldState = connectionStates.current.get(peerId);
      
      if (newState !== oldState) {
        console.log(`Connection state with ${peerId}: ${oldState} -> ${newState}`);
        connectionStates.current.set(peerId, newState);
        
        if (newState === 'connected') {
          console.log('Successfully connected to:', peerId);
          connectionAttempts.current.delete(peerId);
          pendingOffers.current.delete(peerId);
          establishedConnections.current.add(peerId);
        } else if (newState === 'failed') {
          console.log('Connection failed for:', peerId);
          establishedConnections.current.delete(peerId);
          handleConnectionFailure(peerId);
        } else if (newState === 'disconnected') {
          console.log('Connection disconnected for:', peerId);
          establishedConnections.current.delete(peerId);
          // Only handle as failure if it stays disconnected
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              handleConnectionFailure(peerId);
            }
          }, 10000); // Wait 10 seconds before considering it failed
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connection established with:', peerId);
      } else if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed with:', peerId);
        handleConnectionFailure(peerId);
      }
    };

    pc.onsignalingstatechange = () => {
      console.log(`Signaling state with ${peerId}:`, pc.signalingState);
    };

    peerConnections.current.set(peerId, pc);
    isInitiator.current.set(peerId, isInitiatingCall);
    connectionStates.current.set(peerId, pc.connectionState);
    
    // Process any queued ICE candidates
    const queuedCandidates = iceCandidateQueue.current.get(peerId);
    if (queuedCandidates && queuedCandidates.length > 0) {
      console.log('Processing queued ICE candidates for:', peerId, 'count:', queuedCandidates.length);
      queuedCandidates.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      });
      iceCandidateQueue.current.delete(peerId);
    }
    
    return pc;
  };

  const handleConnectionFailure = (peerId: string) => {
    const attempts = connectionAttempts.current.get(peerId) || 0;
    const wasInitiator = isInitiator.current.get(peerId) || false;
    
    // Only retry if we were the initiator and haven't exceeded max attempts
    if (attempts < 3 && wasInitiator) {
      console.log(`Retrying connection to ${peerId}, attempt ${attempts + 1}`);
      connectionAttempts.current.set(peerId, attempts + 1);
      
      // Clean up current connection
      removePeerConnection(peerId);
      
      // Retry after a delay
      setTimeout(() => {
        if (localStream && !peerConnections.current.has(peerId)) {
          initiateCall(peerId);
        }
      }, 2000 + (attempts * 2000)); // Increasing delay: 2s, 4s, 6s
    } else {
      console.log(`Not retrying connection to ${peerId} (attempts: ${attempts}, was initiator: ${wasInitiator})`);
      removePeerConnection(peerId);
    }
  };

  const removePeerConnection = (peerId: string) => {
    console.log('Removing peer connection for:', peerId);
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    connectionAttempts.current.delete(peerId);
    pendingOffers.current.delete(peerId);
    isInitiator.current.delete(peerId);
    connectionStates.current.delete(peerId);
    establishedConnections.current.delete(peerId);
    iceCandidateQueue.current.delete(peerId);
    
    setRemoteStreams(prev => {
      if (prev.has(peerId)) {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        console.log('Removed remote stream for:', peerId);
        return newMap;
      }
      return prev;
    });
  };

  const initiateCall = async (peerId: string) => {
    if (!localStream || !gameId || !playerId) {
      console.log('Cannot initiate call - missing requirements:', {
        localStream: !!localStream,
        gameId: !!gameId,
        playerId: !!playerId
      });
      return;
    }

    // Prevent duplicate offers
    if (pendingOffers.current.has(peerId)) {
      console.log('Already have pending offer for:', peerId);
      return;
    }

    // Check if we already have a working connection
    const existingPc = peerConnections.current.get(peerId);
    if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting')) {
      console.log('Already have working connection for:', peerId);
      return;
    }

    console.log('Initiating call to:', peerId);
    pendingOffers.current.add(peerId);
    
    const pc = createPeerConnection(peerId, true);
    
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false
      });
      
      console.log('Created offer for:', peerId, {
        type: offer.type,
        sdpLength: offer.sdp?.length
      });
      
      await pc.setLocalDescription(offer);
      console.log('Set local description for:', peerId);
      
      console.log('Sending offer to:', peerId);
      await sendSignalingMessage('offer', peerId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
      pendingOffers.current.delete(peerId);
      removePeerConnection(peerId);
    }
  };

  const handleOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
    if (!localStream || !gameId) {
      console.log('Cannot handle offer - missing requirements');
      return;
    }

    // Check if we already have a working connection
    const existingPc = peerConnections.current.get(from);
    if (existingPc && (existingPc.connectionState === 'connected' || existingPc.connectionState === 'connecting')) {
      console.log('Ignoring offer from', from, '- already have working connection');
      return;
    }

    // If we have a pending offer to this peer, use deterministic ordering
    if (pendingOffers.current.has(from) && playerId! < from) {
      console.log('Ignoring offer from', from, '- we should be the initiator');
      return;
    }

    console.log('Handling offer from:', from, {
      type: offer.type,
      sdpLength: offer.sdp?.length
    });
    
    const pc = createPeerConnection(from, false);
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('Set remote description for offer from:', from);
      
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Created answer for:', from, {
        type: answer.type,
        sdpLength: answer.sdp?.length
      });
      
      await pc.setLocalDescription(answer);
      console.log('Set local description for answer to:', from);
      
      console.log('Sending answer to:', from);
      await sendSignalingMessage('answer', from, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
      removePeerConnection(from);
    }
  };

  const handleAnswer = async (from: string, answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer from:', from, {
      type: answer.type,
      sdpLength: answer.sdp?.length
    });
    
    const pc = peerConnections.current.get(from);
    if (pc && pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Answer set successfully for:', from);
        pendingOffers.current.delete(from);
      } catch (error) {
        console.error('Error handling answer:', error);
        removePeerConnection(from);
      }
    } else {
      console.warn('No peer connection in correct state for answer from:', from, 'state:', pc?.signalingState);
    }
  };

  const handleIceCandidate = async (from: string, candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate from:', from, {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex
    });
    
    const pc = peerConnections.current.get(from);
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE candidate added for:', from);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    } else {
      console.log('Queueing ICE candidate for later, peer connection not ready:', from);
      const queue = iceCandidateQueue.current.get(from) || [];
      queue.push(candidate);
      iceCandidateQueue.current.set(from, queue);
    }
  };

  const establishConnections = async (peerIds: string[]) => {
    if (!localStream || !gameId || !playerId || peerIds.length === 0) {
      console.log('Cannot establish connections - missing requirements:', {
        localStream: !!localStream,
        gameId: !!gameId,
        playerId: !!playerId,
        peerIds: peerIds.length
      });
      return;
    }

    console.log('Establishing connections with peers:', peerIds);
    
    // Initiate calls to all peers with staggered timing
    peerIds.forEach((peerId, index) => {
      // Skip if we already have an established connection
      if (establishedConnections.current.has(peerId)) {
        console.log('Skipping', peerId, '- already connected');
        return;
      }

      setTimeout(() => {
        const existingPc = peerConnections.current.get(peerId);
        if (!existingPc || (existingPc.connectionState !== 'connected' && existingPc.connectionState !== 'connecting')) {
          console.log('Initiating call to:', peerId);
          initiateCall(peerId);
        }
      }, index * 1500); // 1.5 second delay between each connection attempt
    });
  };

  // Start polling for signaling messages when gameId and playerId are available
  useEffect(() => {
    if (gameId && playerId) {
      pollingInterval.current = setInterval(pollSignalingMessages, 1500); // Poll every 1.5 seconds
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
      };
    }
  }, [gameId, playerId, pollSignalingMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up WebRTC connections');
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
      }
      peerConnections.current.forEach((pc, peerId) => {
        console.log('Closing peer connection for:', peerId);
        pc.close();
      });
      peerConnections.current.clear();
      connectionAttempts.current.clear();
      pendingOffers.current.clear();
      isInitiator.current.clear();
      connectionStates.current.clear();
      establishedConnections.current.clear();
      iceCandidateQueue.current.clear();
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
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
    initiateCall,
    establishConnections
  };
}