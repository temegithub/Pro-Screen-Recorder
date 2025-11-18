
export type CaptureMode = 'screenshot' | 'screen-video' | 'audio-only' | 'screen-and-cam';

export type VideoResolution = 'auto' | '720p' | '1080p' | '1440p' | '4k';
export type VideoFramerate = 30 | 60;
export type VideoBitratePreset = 'low' | 'medium' | 'high' | 'custom';
export type VideoContainer = 'mp4' | 'webm';
export type VideoCodec = 'h264' | 'h265' | 'vp9' | 'av1';

export type AudioBitratePreset = '128kbps' | '192kbps' | '320kbps';
export type AudioCodec = 'aac' | 'opus';

export type ImageFormat = 'png' | 'jpeg';

export interface CaptureSettings {
  mode: CaptureMode;
  // Video settings
  resolution: VideoResolution;
  framerate: VideoFramerate;
  videoBitrate: VideoBitratePreset;
  customVideoBitrate: number; // in Mbps
  container: VideoContainer;
  videoCodec: VideoCodec;
  // Audio settings
  includeMic: boolean;
  includeSystemAudio: boolean;
  audioBitrate: AudioBitratePreset;
  audioCodec: AudioCodec;
  // Screenshot settings
  imageFormat: ImageFormat;
  jpegQuality: number; // 0-1
  // Camera overlay
  cameraDeviceId: string | null;
}

export interface CapturedFile {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  type: 'video' | 'image' | 'audio';
  createdAt: Date;
  duration?: number; // in seconds
}

export type View = 'permissions' | 'capture' | 'gallery' | 'editor';

export type RecorderStatus = 'idle' | 'permission' | 'acquiring' | 'recording' | 'paused' | 'stopped' | 'error';
