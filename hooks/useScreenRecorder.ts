import { useState, useRef, useCallback, useEffect } from 'react';
import { CaptureSettings, RecorderStatus, CapturedFile, CaptureMode } from '../types';
import { getSupportedMimeType } from '../utils/helpers';

interface UseScreenRecorderProps {
  onStop: (file: CapturedFile) => void;
}

export const useScreenRecorder = ({ onStop }: UseScreenRecorderProps) => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const captureModeRef = useRef<CaptureMode | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeMimeTypeRef = useRef<string>('');
  
  // Store cleanup functions for compositors, audio contexts, etc.
  const cleanupCallbacks = useRef<(() => void)[]>([]);
  
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Execute all extra cleanup callbacks (canvas loops, audio context)
    cleanupCallbacks.current.forEach(cb => cb());
    cleanupCallbacks.current = [];

    recordedChunksRef.current = [];
    setTimer(0);
    // Do not clear activeMimeTypeRef here as it might be needed in onstop logic if called immediately after
  }, []);

  const handleDataAvailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      recordedChunksRef.current.push(event.data);
    }
  };

  const handleStop = () => {
    if (recordedChunksRef.current.length === 0) {
      // It's possible stop is called before data is available or if error occurred
      if (status !== 'error') {
          console.warn("No data recorded.");
      }
      setStatus('stopped');
      cleanup();
      return;
    };
    
    // Prioritize the actual mime type used by the MediaRecorder
    let mimeType = mediaRecorderRef.current?.mimeType;
    
    // If not available, fall back to the one we requested or a safe default
    if (!mimeType || mimeType === '') {
        if (captureModeRef.current === 'audio-only') {
             mimeType = activeMimeTypeRef.current || 'audio/webm';
        } else {
             mimeType = activeMimeTypeRef.current || 'video/webm';
        }
    }

    // Force audio mime type if in audio mode
    if (captureModeRef.current === 'audio-only' && mimeType.includes('video')) {
        mimeType = mimeType.replace('video', 'audio');
    }
    
    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const duration = (Date.now() - startTimeRef.current) / 1000;
    const fileType = captureModeRef.current === 'audio-only' ? 'audio' : 'video';
    
    // Determine extension
    let fileExtension = 'webm';
    if (mimeType.includes('mp4')) {
        fileExtension = fileType === 'audio' ? 'm4a' : 'mp4';
    } else if (mimeType.includes('wav')) fileExtension = 'wav';
    else if (mimeType.includes('ogg')) fileExtension = 'ogg';
    else if (mimeType.includes('mp3')) fileExtension = 'mp3';
    else if (mimeType.includes('x-matroska')) fileExtension = 'mkv';
    else if (mimeType.includes('webm')) fileExtension = 'webm';
    
    onStop({
      id: new Date().toISOString(),
      name: `recording-${Date.now()}.${fileExtension}`,
      url,
      blob,
      type: fileType,
      createdAt: new Date(),
      duration: duration,
    });
    
    setStatus('stopped');
    cleanup();
  };

  const startTimer = () => {
      startTimeRef.current = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
          setTimer(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
  };

  const stopTimer = () => {
      if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
      }
  };

  const startRecording = useCallback(async (settings: CaptureSettings) => {
    if (status === 'recording' || status === 'acquiring') return;
    cleanup(); // Clean previous state
    setStatus('acquiring');
    setError(null);
    captureModeRef.current = settings.mode;

    try {
      let finalStream: MediaStream;

      if (settings.mode === 'screen-and-cam') {
        // --- Screen & Cam Mode ---
        
        // 1. Get Screen Stream
        // This might throw NotAllowedError if user cancels
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
           video: true,
           audio: settings.includeSystemAudio,
        });
        
        // 2. Get Camera Stream (silently fail if denied, but warn)
        let cameraStream: MediaStream | null = null;
        try {
             cameraStream = await navigator.mediaDevices.getUserMedia({
                 video: {
                     deviceId: settings.cameraDeviceId ? { exact: settings.cameraDeviceId } : undefined,
                     width: { ideal: 1280 },
                     aspectRatio: 1.777
                 },
                 audio: false // mic is handled separately
             });
        } catch (e) {
            console.warn("Could not acquire camera for composition:", e);
        }

        // 3. Get Mic Stream
        let micStream: MediaStream | null = null;
        if (settings.includeMic) {
             try {
                 micStream = await navigator.mediaDevices.getUserMedia({
                     audio: { echoCancellation: true, noiseSuppression: true }
                 });
             } catch (e) {
                 console.warn("Could not acquire microphone:", e);
             }
        }

        // 4. Composite Video
        if (cameraStream) {
             // Await the composition setup to ensure video is playing and dimensions are known
             const { stream: videoStream, cleanup: vidCleanup } = await setupVideoComposition(screenStream, cameraStream);
             cleanupCallbacks.current.push(vidCleanup);
             
             // 5. Mix Audio
             const audioStreamsToMix = [];
             if (screenStream.getAudioTracks().length > 0) audioStreamsToMix.push(screenStream);
             if (micStream) audioStreamsToMix.push(micStream);
             
             let combinedAudioTrack: MediaStreamTrack | null = null;
             if (audioStreamsToMix.length > 0) {
                 const { track, cleanup: audioCleanup } = mixAudioTracks(audioStreamsToMix);
                 combinedAudioTrack = track;
                 cleanupCallbacks.current.push(audioCleanup);
             }
             
             const tracks = [...videoStream.getVideoTracks()];
             if (combinedAudioTrack) tracks.push(combinedAudioTrack);
             
             finalStream = new MediaStream(tracks);
        } else {
             // Fallback: No camera, just screen (+ combined audio)
             const audioStreamsToMix = [];
             if (screenStream.getAudioTracks().length > 0) audioStreamsToMix.push(screenStream);
             if (micStream) audioStreamsToMix.push(micStream);

             let combinedAudioTrack: MediaStreamTrack | null = null;
             if (audioStreamsToMix.length > 0) {
                 const { track, cleanup: audioCleanup } = mixAudioTracks(audioStreamsToMix);
                 combinedAudioTrack = track;
                 cleanupCallbacks.current.push(audioCleanup);
             }
             
             const tracks = [...screenStream.getVideoTracks()];
             if (combinedAudioTrack) tracks.push(combinedAudioTrack);
             
             finalStream = new MediaStream(tracks);
        }
        
        // Stop recording if user stops screen share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
             stopRecording();
        };

      } else {
        // --- Standard Modes (Screen, Audio Only, etc) ---
        
        let audioStream: MediaStream | null = null;
        let videoStream: MediaStream | null = null;

        // Only request microphone if explicitly requested (mic enabled) or mandatory (audio-only).
        // Do NOT request it just because includeSystemAudio is checked.
        if (settings.includeMic || settings.mode === 'audio-only') {
          try {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (e) {
             // If audio-only mode, this is a fatal error.
             if (settings.mode === 'audio-only') throw e;
             
             // For screen modes, if mic fails (denied/unavailable), we warn but continue.
             console.warn("Microphone access failed or was denied. Proceeding without microphone.", e);
          }
        }

        if (settings.mode.includes('screen')) {
           try {
             videoStream = await navigator.mediaDevices.getDisplayMedia({
               video: true,
               audio: settings.includeSystemAudio,
             });
           } catch (e) {
             // If screen share is cancelled/fails, we must stop the audio stream if we acquired it
             if (audioStream) {
               audioStream.getTracks().forEach(t => t.stop());
             }
             throw e;
           }
           
           videoStream.getVideoTracks()[0].onended = () => {
               stopRecording();
           };
        }

        const tracks: MediaStreamTrack[] = [];
        if (videoStream) tracks.push(...videoStream.getTracks());
        if (audioStream) tracks.push(...audioStream.getTracks());
        
        if(tracks.length === 0) {
            throw new Error("No media tracks were acquired.");
        }
        
        finalStream = new MediaStream(tracks);
      }

      streamRef.current = finalStream;
      
      const mimeType = getSupportedMimeType(settings);
      activeMimeTypeRef.current = mimeType || '';
      
      const options = activeMimeTypeRef.current ? { mimeType: activeMimeTypeRef.current } : undefined;
      
      mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current.ondataavailable = handleDataAvailable;
      mediaRecorderRef.current.onstop = handleStop;
      mediaRecorderRef.current.start(1000); // Request data every second
      
      startTimer();
      setStatus('recording');

    } catch (err: any) {
      cleanup();
      
      const errorMessage = err?.message?.toLowerCase() || '';
      const errorName = err?.name || '';
      
      const isPermissionError = 
        errorName === 'NotAllowedError' || 
        errorName === 'PermissionDeniedError' || 
        errorMessage.includes('permission denied') || 
        errorMessage.includes('user denied') ||
        errorMessage.includes('declined') ||
        errorMessage.includes('cancelled');

      if (isPermissionError) {
          console.log("Recording cancelled by user or permission denied.");
          setStatus('idle');
          return;
      }

      console.error("Failed to start recording:", err);
      const displayMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to start recording: ${displayMessage}`);
      setStatus('error');
    }
  }, [cleanup, onStop, status]); // Removed stopRecording from dependency to avoid cycle, it's stable

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      stopTimer();
    } else if (status === 'recording' || status === 'paused') {
        // Fallback if recorder is null but status implies recording
        cleanup();
        setStatus('stopped');
    }
  }, [status, cleanup]);
  
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
        mediaRecorderRef.current.pause();
        stopTimer();
        setStatus('paused');
    }
  }, [status]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
        mediaRecorderRef.current.resume();
        startTimeRef.current = Date.now() - (timer * 1000);
        startTimer();
        setStatus('recording');
    }
  }, [status, timer]);


  const takeScreenshot = useCallback(async (settings: Partial<CaptureSettings>) => {
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      
      await new Promise((resolve) => {
        if (video.readyState >= 2) {
            resolve(true);
        } else {
            video.onloadedmetadata = () => {
                video.play().then(() => resolve(true)).catch(() => resolve(true));
            };
            // Timeout safety
            setTimeout(() => resolve(true), 1500);
        }
      });
      
      // Short delay to ensure rendering
      await new Promise(r => setTimeout(r, 200));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error("Could not get canvas context");
      context.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());
      stream = null;

      const mimeType = settings.imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = settings.jpegQuality ?? 0.9;

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (!blob) throw new Error("Failed to create blob from canvas.");
      
      const url = URL.createObjectURL(blob);
      onStop({
          id: new Date().toISOString(),
          name: `screenshot-${Date.now()}.${settings.imageFormat || 'png'}`,
          url,
          blob,
          type: 'image',
          createdAt: new Date(),
      });

    } catch (err: any) {
      if (stream) {
        (stream as MediaStream).getTracks().forEach(track => track.stop());
      }
      
      const errorMessage = err?.message?.toLowerCase() || '';
      const errorName = err?.name || '';
      
      // Handle cancellation gracefully
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError' || errorMessage.includes('permission denied')) return;
      
      const displayMessage = err instanceof Error ? err.message : String(err);
      setError(`Screenshot failed: ${displayMessage}`);
    }
  }, [onStop]);


  useEffect(() => {
      return () => cleanup();
  }, [cleanup]);

  return { status, error, timer, startRecording, stopRecording, pauseRecording, resumeRecording, takeScreenshot };
};

// --- Helpers ---

async function setupVideoComposition(screenStream: MediaStream, cameraStream: MediaStream): Promise<{ stream: MediaStream, cleanup: () => void }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Helper to setup video element with robust playback requirements
    const setupVideo = (stream: MediaStream) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        return video;
    };

    const screenVideo = setupVideo(screenStream);
    const cameraVideo = setupVideo(cameraStream);
    
    // Wait for screen video metadata to ensure we have correct dimensions before recording
    await new Promise<void>((resolve) => {
        if (screenVideo.readyState >= 1) { // HAVE_METADATA
            resolve();
        } else {
            screenVideo.onloadedmetadata = () => resolve();
            // Fallback timeout to prevent hanging
            setTimeout(resolve, 2000);
        }
    });

    // Ensure playback starts
    screenVideo.play().catch(e => console.warn("Screen video play failed", e));
    cameraVideo.play().catch(e => console.warn("Cam video play failed", e));
    
    // Set canvas size based on actual screen dimensions
    // If videoWidth is still 0 for some reason, default to 1920x1080 to prevent MediaRecorder failure
    canvas.width = screenVideo.videoWidth || 1920;
    canvas.height = screenVideo.videoHeight || 1080;
    
    let animationId: number;
    
    const draw = () => {
      if (!ctx) return;
      
      // Update width if it changes (e.g. rotation)
      if (screenVideo.videoWidth && (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight)) {
          canvas.width = screenVideo.videoWidth;
          canvas.height = screenVideo.videoHeight;
      }
      
      const width = canvas.width;
      const height = canvas.height;
      
      // Draw Screen
      ctx.drawImage(screenVideo, 0, 0, width, height);
      
      // Draw Camera (Bottom Right)
      if (cameraVideo.readyState >= 2) { // HAVE_CURRENT_DATA
           const camRatio = cameraVideo.videoWidth / cameraVideo.videoHeight || 1.77;
           const camWidth = width * 0.20; // 20% width
           const camHeight = camWidth / camRatio;
           const padding = Math.max(20, width * 0.02);
           
           const x = width - camWidth - padding;
           const y = height - camHeight - padding;
           
           ctx.save();
           
           // Add a subtle border/shadow for visibility
           ctx.strokeStyle = 'white';
           ctx.lineWidth = 4;
           ctx.shadowColor = 'rgba(0,0,0,0.5)';
           ctx.shadowBlur = 10;
           
           ctx.strokeRect(x, y, camWidth, camHeight);
           ctx.drawImage(cameraVideo, x, y, camWidth, camHeight);
           
           ctx.restore();
      }
      
      animationId = requestAnimationFrame(draw);
    };
    
    // Start loop
    animationId = requestAnimationFrame(draw);
    
    // Capture stream from canvas
    // 30 FPS is usually sufficient for screen recording to save performance
    const stream = canvas.captureStream(30);
    
    const cleanup = () => {
        cancelAnimationFrame(animationId);
        screenVideo.pause();
        screenVideo.srcObject = null;
        cameraVideo.pause();
        cameraVideo.srcObject = null;
        screenVideo.remove();
        cameraVideo.remove();
        canvas.remove();
    };
    
    return { stream, cleanup };
}

function mixAudioTracks(streams: MediaStream[]): { track: MediaStreamTrack, cleanup: () => void } {
    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();
    const sources: MediaStreamAudioSourceNode[] = [];

    streams.forEach(stream => {
        if (stream.getAudioTracks().length > 0) {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(dest);
            sources.push(source);
        }
    });

    const track = dest.stream.getAudioTracks()[0];
    
    const cleanup = () => {
        sources.forEach(s => s.disconnect());
        audioContext.close();
    };
    
    return { track, cleanup };
}
