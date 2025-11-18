
import React, { useState, useEffect } from 'react';
import { CaptureSettings, CaptureMode, RecorderStatus } from '../types';
import { CameraIcon, ClapperboardIcon, MicIcon, MonitorIcon, SettingsIcon, ChevronDownIcon } from './icons';

interface CaptureControlsProps {
  onStart: (settings: CaptureSettings) => void;
  onScreenshot: (settings: CaptureSettings) => void;
  isRecording: boolean;
  status: RecorderStatus;
}

const defaultSettings: CaptureSettings = {
  mode: 'screen-video',
  resolution: '1080p',
  framerate: 30,
  videoBitrate: 'medium',
  customVideoBitrate: 5,
  container: 'mp4',
  videoCodec: 'h264',
  includeMic: true,
  includeSystemAudio: true,
  audioBitrate: '192kbps',
  audioCodec: 'aac',
  imageFormat: 'png',
  jpegQuality: 0.9,
  cameraDeviceId: null,
};

const ModeButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2 ${
            isActive ? 'bg-brand-blue/20 border-brand-blue' : 'bg-dark-surface border-dark-border hover:border-gray-600'
        }`}
    >
        {icon}
        <span className="font-semibold">{label}</span>
    </button>
);

const CaptureControls: React.FC<CaptureControlsProps> = ({ onStart, onScreenshot, isRecording, status }) => {
  const [settings, setSettings] = useState<CaptureSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setCameraDevices(videoInputs);

        // Set default camera if available and not set
        if (videoInputs.length > 0) {
          setSettings(prev => {
            if (!prev.cameraDeviceId || !videoInputs.find(d => d.deviceId === prev.cameraDeviceId)) {
               return { ...prev, cameraDeviceId: videoInputs[0].deviceId };
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("Failed to fetch devices:", e);
      }
    };

    fetchDevices();
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
  }, []);

  const handleStart = () => {
    if (settings.mode === 'screenshot') {
      onScreenshot(settings);
    } else {
      onStart(settings);
    }
  };

  const isActionable = status === 'idle' || status === 'stopped';
  const buttonText = () => {
    if (settings.mode === 'screenshot') return 'Take Screenshot';
    if (status === 'acquiring') return 'Starting...';
    return 'Start Recording';
  };

  return (
    <div className="max-w-3xl mx-auto bg-dark-surface rounded-xl border border-dark-border p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Capture Mode</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ModeButton label="Screen Video" icon={<ClapperboardIcon className="w-8 h-8"/>} isActive={settings.mode === 'screen-video'} onClick={() => setSettings(s => ({...s, mode: 'screen-video'}))}/>
            <ModeButton label="Screenshot" icon={<MonitorIcon className="w-8 h-8"/>} isActive={settings.mode === 'screenshot'} onClick={() => setSettings(s => ({...s, mode: 'screenshot'}))}/>
            <ModeButton label="Screen + Cam" icon={<div className="relative w-8 h-8"><ClapperboardIcon className="w-8 h-8"/><CameraIcon className="w-4 h-4 absolute bottom-0 right-0 bg-dark-surface rounded-full p-0.5"/></div>} isActive={settings.mode === 'screen-and-cam'} onClick={() => setSettings(s => ({...s, mode: 'screen-and-cam'}))}/>
            <ModeButton label="Audio Only" icon={<MicIcon className="w-8 h-8"/>} isActive={settings.mode === 'audio-only'} onClick={() => setSettings(s => ({...s, mode: 'audio-only'}))}/>
        </div>

        {/* Camera Selection Dropdown */}
        {settings.mode === 'screen-and-cam' && (
          <div className="mt-6 animate-fadeIn">
             <label className="block text-sm font-bold text-dark-text-secondary mb-2">Select Camera</label>
             <div className="relative">
                <select 
                    value={settings.cameraDeviceId || ''} 
                    onChange={(e) => setSettings(s => ({...s, cameraDeviceId: e.target.value}))}
                    className="w-full appearance-none bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text-primary focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition-colors cursor-pointer"
                >
                    {cameraDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera (${device.deviceId.slice(0,8)}...)`}
                        </option>
                    ))}
                    {cameraDevices.length === 0 && <option value="">No cameras found</option>}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-dark-text-secondary">
                   <ChevronDownIcon className="w-4 h-4" />
                </div>
             </div>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-bold mb-4">Audio Sources</h3>
        <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={settings.includeMic} onChange={e => setSettings(s => ({...s, includeMic: e.target.checked}))} className="w-5 h-5 accent-brand-blue" />
                <span>Microphone</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={settings.includeSystemAudio} onChange={e => setSettings(s => ({...s, includeSystemAudio: e.target.checked}))} className="w-5 h-5 accent-brand-blue" />
                <span>System Audio</span>
            </label>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!isActionable || isRecording}
        className="w-full bg-brand-blue text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-xl"
      >
        {buttonText()}
      </button>

      <div className="text-center">
        <button onClick={() => setShowSettings(!showSettings)} className="text-brand-blue hover:underline flex items-center justify-center mx-auto space-x-2">
            <SettingsIcon className="w-5 h-5" />
            <span>{showSettings ? 'Hide' : 'Show'} Advanced Settings</span>
        </button>
      </div>

      {showSettings && (
        <div className="space-y-6 pt-6 border-t border-dark-border">
          {/* Advanced settings UI can be added here, e.g., resolution, framerate, etc. */}
          <p className="text-center text-dark-text-secondary">Advanced settings for resolution, bitrate, codecs, etc. will be available here.</p>
        </div>
      )}
    </div>
  );
};

export default CaptureControls;
