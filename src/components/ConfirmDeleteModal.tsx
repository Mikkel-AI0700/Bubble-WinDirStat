import React from 'react';
import { AlertTriangle, Folder, FileText, Trash2, X } from 'lucide-react';
import { formatSize, RankedDirItem } from '../utils/bubblePacking';

interface ConfirmDeleteModalProps {
  item: RankedDirItem | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  item,
  onCancel,
  onConfirm,
}) => {
  if (!item) return null;

  const isDirectory = item.is_dir;
  const title = isDirectory ? 'Confirm Delete Directory' : 'Confirm Delete File';
  const promptText = isDirectory
    ? 'Are you sure you want to permanently delete this entire directory and all of its contents?'
    : 'Are you sure you want to permanently delete this file?';
  const confirmButtonLabel = isDirectory
    ? 'Yes, Delete Directory'
    : 'Yes, Delete File';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="w-full max-w-md bg-[#1e1e2e] border border-[#313244] rounded-lg overflow-hidden text-[#cdd6f4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#313244] bg-[#181825]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[#f38ba8] shrink-0" />
            <h2 id="confirm-delete-title" className="text-sm font-bold text-[#cdd6f4]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel deletion"
            className="p-1 text-[#a6adc8] hover:text-[#cdd6f4] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-sm text-[#cdd6f4] leading-relaxed">{promptText}</p>

          <div className="p-3.5 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#cdd6f4] text-sm break-all">
              {isDirectory ? (
                <Folder className="w-4 h-4 text-[#f9e2af] shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-[#89b4fa] shrink-0" />
              )}
              <span>{item.name}</span>
            </div>

            <div className="flex items-center justify-between text-[#a6adc8] pt-1 border-t border-[#313244]/60">
              <span>Type:</span>
              <span className="font-medium text-[#cdd6f4]">
                {isDirectory ? 'Entire Directory & Contents' : `File (${item.category})`}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#a6adc8]">
              <span>Size to Free:</span>
              <span className="font-mono tabular-nums font-semibold text-[#cdd6f4]">
                {formatSize(item.size)} ({item.size.toLocaleString()} B)
              </span>
            </div>

            {item.path && (
              <div className="flex items-start justify-between gap-3 text-[#a6adc8]">
                <span className="shrink-0">Path:</span>
                <span className="font-mono text-[#cdd6f4] text-right break-all">
                  {item.path}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-[#313244] bg-[#181825]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-[#cdd6f4] bg-[#313244] hover:bg-[#45475a] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            No, Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#f38ba8] hover:bg-[#eba0ac] text-[#11111b] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
