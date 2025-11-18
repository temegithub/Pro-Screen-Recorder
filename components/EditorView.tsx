
import React from 'react';
import { CapturedFile } from '../types';
import { DownloadIcon, ShareIcon, TrashIcon, MicIcon } from './icons';

interface EditorViewProps {
  file: CapturedFile;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EditorView: React.FC<EditorViewProps> = ({ file, onClose, onDelete }) => {
    
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!navigator.share) {
        alert("Web Share API is not supported in this browser. Please use the Download button.");
        return;
    }

    // Strip codecs from mime type for sharing, as some implementations (like Chrome) are picky
    // e.g., convert "video/webm;codecs=vp8" -> "video/webm"
    const baseMimeType = file.blob.type.split(';')[0];
    const fileObj = new File([file.blob], file.name, { type: baseMimeType });

    if (navigator.canShare && !navigator.canShare({ files: [fileObj] })) {
        alert(`Your browser does not support sharing this specific file type (${baseMimeType}). Please download it instead.`);
        return;
    }

    try {
      await navigator.share({
        title: 'Share Capture',
        text: `Check out this capture: ${file.name}`,
        files: [fileObj],
      });
    } catch (error) {
      console.error('Error sharing:', error);
      if (error instanceof Error) {
          // Ignore user cancellation
          if (error.name === 'AbortError') return;

          if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
             alert("Sharing was denied by the browser. This may be due to security restrictions in this environment or an unsupported file type. Please try downloading the file.");
          } else {
             alert(`Share failed: ${error.message}`);
          }
      }
    }
  };

  const handleDelete = () => {
      if (window.confirm(`Are you sure you want to delete "${file.name}"? This cannot be undone.`)) {
          onDelete(file.id);
      }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={onClose} className="text-brand-blue hover:underline">&larr; Back to Gallery</button>
          <h2 className="text-3xl font-bold truncate">{file.name}</h2>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={handleDownload} className="p-2 bg-dark-surface hover:bg-dark-border rounded-lg transition-colors flex items-center space-x-2">
                <DownloadIcon className="w-5 h-5"/>
                <span>Download</span>
            </button>
            <button onClick={handleShare} className="p-2 bg-dark-surface hover:bg-dark-border rounded-lg transition-colors flex items-center space-x-2">
                <ShareIcon className="w-5 h-5"/>
                <span>Share</span>
            </button>
            <button onClick={handleDelete} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg transition-colors flex items-center space-x-2">
                <TrashIcon className="w-5 h-5"/>
            </button>
        </div>
      </div>
      
      <div className="flex-grow bg-black/20 rounded-lg flex items-center justify-center border border-dark-border overflow-hidden relative p-8">
        {file.type === 'video' && (
          <video src={file.url} controls autoPlay className="max-w-full max-h-[70vh] rounded-lg shadow-2xl" />
        )}
        
        {file.type === 'audio' && (
          <div className="flex flex-col items-center w-full max-w-md space-y-8">
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 flex items-center justify-center border border-brand-blue/30 shadow-[0_0_30px_rgba(0,122,255,0.15)]">
                 <MicIcon className="w-20 h-20 text-brand-blue opacity-80" />
            </div>
            <audio src={file.url} controls className="w-full shadow-lg rounded-full" />
          </div>
        )}

        {file.type === 'image' && (
          <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh] rounded-lg shadow-2xl" />
        )}
      </div>

      {/* Basic editor controls can be added below */}
      <div className="mt-6 p-6 bg-dark-surface rounded-lg border border-dark-border">
        <h3 className="text-xl font-bold mb-4">Details</h3>
        <div className="text-dark-text-secondary text-sm grid grid-cols-2 gap-4 max-w-md">
             <div>
                 <span className="block text-gray-500">Type</span>
                 <span className="capitalize">{file.type}</span>
             </div>
             <div>
                 <span className="block text-gray-500">Format</span>
                 <span className="uppercase">{file.blob.type.split(';')[0].split('/')[1] || 'Unknown'}</span>
             </div>
             <div>
                 <span className="block text-gray-500">Size</span>
                 <span>{(file.blob.size / (1024 * 1024)).toFixed(2)} MB</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default EditorView;
