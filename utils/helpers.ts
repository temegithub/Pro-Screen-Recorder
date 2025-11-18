
import { CaptureSettings } from '../types';

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export const getSupportedMimeType = (settings: CaptureSettings): string => {
    const isSupported = (type: string) => {
        if (typeof MediaRecorder === 'undefined') return false;
        return MediaRecorder.isTypeSupported(type);
    };

    if (settings.mode === 'audio-only') {
        const candidates = [
            'audio/mp4; codecs=mp4a.40.2', // AAC in MP4 container (Best for compatibility)
            'audio/mp4',
            'audio/webm; codecs=opus',     // Standard WebM Audio
            'audio/webm',
            'audio/ogg; codecs=opus',
            'audio/ogg'
        ];
        return candidates.find(isSupported) || '';
    }

    // Video Mode
    const candidates: string[] = [];
    
    if (settings.container === 'mp4') {
        // Try strictly compatible MP4 (H.264 + AAC) first. 
        // This fixes issues where "mp4" might default to Opus audio which some players don't support.
        candidates.push('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'); 
        candidates.push('video/mp4; codecs="avc1.64001E, mp4a.40.2"'); 
        candidates.push('video/mp4'); // Generic MP4
        
        // Fallbacks if MP4 not available, but user wanted 'safe' video
        candidates.push('video/webm; codecs=h264'); // H.264 in WebM
    }

    // WebM preferences (and default fallbacks)
    candidates.push('video/webm; codecs=vp9');
    candidates.push('video/webm; codecs="vp9,opus"');
    candidates.push('video/webm; codecs=vp8');
    candidates.push('video/webm');
    
    // Last resort generic types
    candidates.push('video/mp4');

    return candidates.find(isSupported) || '';
};
