
import React, { useState, useCallback } from 'react';
import { CaptureSettings, CapturedFile, View } from './types';
import PermissionsGate from './components/PermissionsGate';
import CaptureControls from './components/CaptureControls';
import PreviewGallery from './components/PreviewGallery';
import EditorView from './components/EditorView';
import { Header } from './components/Header';
import { useScreenRecorder } from './hooks/useScreenRecorder';
import FloatingWidget from './components/FloatingWidget';
import { CameraIcon, ClapperboardIcon, MicIcon, MonitorIcon } from './components/icons';

const App: React.FC = () => {
  const [view, setView] = useState<View>('permissions');
  const [capturedFiles, setCapturedFiles] = useState<CapturedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CapturedFile | null>(null);

  const handlePermissionsGranted = useCallback(() => {
    setView('capture');
  }, []);

  const addCapturedFile = useCallback((file: CapturedFile) => {
    setCapturedFiles((prev) => [file, ...prev]);
    setView('gallery');
  }, []);

  const {
    status,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    takeScreenshot,
    timer,
    error,
  } = useScreenRecorder({ onStop: addCapturedFile });

  const handleSelectFile = (file: CapturedFile) => {
    setSelectedFile(file);
    setView('editor');
  };

  const handleCloseEditor = () => {
    setSelectedFile(null);
    setView('gallery');
  };
  
  const handleDeleteFile = (id: string) => {
    setCapturedFiles(files => files.filter(f => f.id !== id));
    if (selectedFile?.id === id) {
      handleCloseEditor();
    }
  };

  const isRecording = status === 'recording' || status === 'paused';

  const renderView = () => {
    switch (view) {
      case 'permissions':
        return <PermissionsGate onGranted={handlePermissionsGranted} />;
      case 'capture':
        return (
          <CaptureControls
            onStart={startRecording}
            onScreenshot={takeScreenshot}
            isRecording={isRecording}
            status={status}
          />
        );
      case 'gallery':
        return <PreviewGallery files={capturedFiles} onSelectFile={handleSelectFile} onDeleteFile={handleDeleteFile} />;
      case 'editor':
        return selectedFile ? <EditorView file={selectedFile} onClose={handleCloseEditor} onDelete={handleDeleteFile} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text-primary font-sans flex flex-col">
      <Header currentView={view} setView={setView} isRecording={isRecording} />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}
        {renderView()}
      </main>
      {isRecording && (
        <FloatingWidget
          status={status}
          timer={timer}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onStop={stopRecording}
          onScreenshot={takeScreenshot}
        />
      )}
    </div>
  );
};

export default App;
