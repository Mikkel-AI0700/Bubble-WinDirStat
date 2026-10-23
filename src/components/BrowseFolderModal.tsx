import React, { useRef } from 'react';
import { Folder, HardDrive, Upload, X } from 'lucide-react';
import { PRESET_DRIVES } from '../data/virtualFileSystem';

interface BrowseFolderModalProps {
  isOpen: boolean;
  currentPath: string;
  availablePaths: string[];
  onClose: () => void;
  onSelectPath: (path: string) => void;
  onUploadLocalFolder: (files: FileList) => void;
}

export const BrowseFolderModal: React.FC<BrowseFolderModalProps> = ({
  isOpen,
  currentPath,
  availablePaths,
  onClose,
  onSelectPath,
  onUploadLocalFolder,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="browse-folder-title"
    >
      <div className="w-full max-w-2xl bg-[#1e1e2e] border border-[#313244] rounded-lg overflow-hidden text-[#cdd6f4]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#313244] bg-[#181825]">
          <h2 id="browse-folder-title" className="text-base font-bold text-[#cdd6f4]">
            Select Directory to Analyze
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close directory browser"
            className="p-1.5 text-[#a6adc8] hover:text-[#cdd6f4] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Option 1: Real Local Folder from Computer */}
          <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#cdd6f4]">
                Scan a Real Folder from Your Computer
              </h3>
              <p className="text-xs text-[#a6adc8] mt-1">
                Pick any local folder on your laptop to calculate subfolder and file sizes directly in the analyzer.
              </p>
            </div>
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                // @ts-expect-error webkitdirectory is standard in modern browsers for directory selection
                webkitdirectory="true"
                directory="true"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUploadLocalFolder(e.target.files);
                    onClose();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#89b4fa] text-[#11111b] rounded-md hover:bg-[#b4befe] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose Local Folder
              </button>
            </div>
          </div>

          {/* Option 2: Presentation Drive Presets */}
          <div>
            <h3 className="text-xs font-semibold text-[#a6adc8] mb-2.5">
              Presentation Drive Presets
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {PRESET_DRIVES.map((preset) => {
                const isActive = currentPath.startsWith(preset.rootPath);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPath(preset.rootPath);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors cursor-pointer flex items-start gap-3 ${
                      isActive
                        ? 'bg-[#313244]/70 border-[#89b4fa]'
                        : 'bg-[#181825] border-[#313244] hover:border-[#45475a]'
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-[#89b4fa] mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#cdd6f4]">
                          {preset.label}
                        </span>
                        <span className="text-xs font-mono text-[#a6adc8] truncate">
                          {preset.rootPath}
                        </span>
                      </div>
                      <p className="text-xs text-[#a6adc8] mt-1">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Option 3: Quick Jump to Subdirectory */}
          <div>
            <h3 className="text-xs font-semibold text-[#a6adc8] mb-2">
              All Indexed Directories ({availablePaths.length})
            </h3>
            <div className="bg-[#181825] border border-[#313244] rounded-lg divide-y divide-[#313244]/60 max-h-48 overflow-y-auto">
              {availablePaths.map((dirPath) => {
                const isCurrent = dirPath === currentPath;
                return (
                  <button
                    key={dirPath}
                    type="button"
                    onClick={() => {
                      onSelectPath(dirPath);
                      onClose();
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-mono flex items-center gap-2 hover:bg-[#313244]/50 transition-colors cursor-pointer ${
                      isCurrent ? 'text-[#89b4fa] font-semibold bg-[#313244]/30' : 'text-[#cdd6f4]'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-[#f9e2af] shrink-0" />
                    <span className="truncate">{dirPath}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#313244] bg-[#181825]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#cdd6f4] bg-[#313244] hover:bg-[#45475a] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
