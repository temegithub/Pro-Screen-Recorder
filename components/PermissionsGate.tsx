
import React, { useState, useCallback } from 'react';
import { CameraIcon, MicIcon, MonitorIcon } from './icons';

interface PermissionsGateProps {
  onGranted: () => void;
}

const PermissionsGate: React.FC<PermissionsGateProps> = ({ onGranted }) => {
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermissions = useCallback(async () => {
    setIsRequesting(true);
    setError(null);
    try {
      // Requesting a screen capture stream is a good proxy for permission.
      // We'll immediately stop the tracks.
      // Only request video here. Requesting audio: true can fail if user doesn't check "Share Audio" box,
      // causing a false negative on permission check.
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      stream.getTracks().forEach(track => track.stop());

      // Also try to get camera/mic to ensure they are available for other modes
      try {
        const userMedia = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        userMedia.getTracks().forEach(track => track.stop());
      } catch (userMediaError) {
        // Don't block if camera/mic fail, user might only want screen recording
        console.warn("Could not acquire camera/microphone, but screen access was granted.", userMediaError);
      }

      onGranted();
    } catch (err) {
      console.error('Permission denied:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
             setError("Access denied by user. You must allow screen sharing to proceed.");
        } else if (err.message && err.message.includes('permissions policy')) {
             setError("Access disallowed by browser permissions policy. Ensure 'display-capture' is allowed.");
        } else {
             setError(`Permission was denied. Error: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred while requesting permissions.');
      }
    } finally {
      setIsRequesting(false);
    }
  }, [onGranted]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-dark-surface rounded-xl border border-dark-border">
      <h2 className="text-3xl font-bold mb-4">Permissions Required</h2>
      <p className="text-dark-text-secondary max-w-md mb-8">
        To capture your screen, camera, and audio, this application needs your permission. We respect your privacy, and no data is uploaded without your explicit consent.
      </p>
      <div className="flex space-x-8 text-dark-text-secondary mb-8">
        <div className="flex flex-col items-center space-y-2">
          <MonitorIcon className="w-10 h-10" />
          <span>Screen</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <CameraIcon className="w-10 h-10" />
          <span>Camera</span>
        </div>
        <div className="flex flex-col items-center space-y-2">
          <MicIcon className="w-10 h-10" />
          <span>Microphone</span>
        </div>
      </div>
      {error && <p className="text-red-400 mb-6 max-w-md">{error}</p>}
      <button
        onClick={requestPermissions}
        disabled={isRequesting}
        className="bg-brand-blue text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
      >
        {isRequesting ? 'Requesting...' : 'Grant Access'}
      </button>
    </div>
  );
};

export default PermissionsGate;
