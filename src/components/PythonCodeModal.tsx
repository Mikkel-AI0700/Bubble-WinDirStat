import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Terminal, X } from 'lucide-react';

interface PythonCodeModalProps {
  isOpen: boolean;
  initialTab?: 'code' | 'presentation';
  onClose: () => void;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({
  isOpen,
  initialTab = 'code',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'presentation'>(initialTab);
  const [pythonCode, setPythonCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen && !pythonCode) {
      fetch('/bubbledirstat.py')
        .then((res) => res.text())
        .then((text) => setPythonCode(text))
        .catch(() => {
          setPythonCode('# Error loading bubbledirstat.py');
        });
    }
  }, [isOpen, pythonCode]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
    }
  };

  const handleDownload = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bubbledirstat.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="python-modal-title"
    >
      <div className="w-full max-w-4xl bg-[#1e1e2e] border border-[#313244] rounded-lg overflow-hidden text-[#cdd6f4] flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#313244] bg-[#181825]">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-[#a6e3a1]" />
            <h2 id="python-modal-title" className="text-base font-bold text-[#cdd6f4]">
              BubbleDirStat — Standalone Python Desktop App & Presentation Guide
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Python desktop script modal"
            className="p-1.5 text-[#a6adc8] hover:text-[#cdd6f4] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-toolbar with Tabs and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#1e1e2e] border-b border-[#313244]">
          <div className="flex items-center gap-1 p-1 bg-[#181825] rounded-md border border-[#313244]">
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[#89b4fa] text-[#11111b]'
                  : 'text-[#a6adc8] hover:text-[#cdd6f4]'
              }`}
            >
              Python Source (bubbledirstat.py)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presentation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'presentation'
                  ? 'bg-[#89b4fa] text-[#11111b]'
                  : 'text-[#a6adc8] hover:text-[#cdd6f4]'
              }`}
            >
              Presentation Talking Points
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#a6e3a1]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Python Code'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#a6e3a1] hover:bg-[#94e2d5] text-[#11111b] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download bubbledirstat.py
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'code' ? (
            <>
              <div className="p-3.5 bg-[#181825] border border-[#313244] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-[#cdd6f4]">
                    Zero External Dependencies — Runs on Standard Python 3 (`tkinter`, `os`, `math`, `threading`)
                  </p>
                  <p className="text-[#a6adc8]">
                    Save as <code className="text-[#f9e2af]">bubbledirstat.py</code> and run directly from terminal, VS Code, PyCharm, or IDLE.
                  </p>
                </div>
                <code className="px-3 py-1.5 bg-[#11111b] border border-[#313244] rounded text-[#a6e3a1] font-mono whitespace-nowrap shrink-0">
                  python bubbledirstat.py
                </code>
              </div>

              <pre className="p-4 bg-[#11111b] border border-[#313244] rounded-lg text-xs font-mono text-[#cdd6f4] overflow-x-auto leading-relaxed select-all">
                <code>{pythonCode || 'Loading bubbledirstat.py...'}</code>
              </pre>
            </>
          ) : (
            <div className="space-y-5 text-sm leading-relaxed">
              <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg">
                <h3 className="text-base font-bold text-[#89b4fa] mb-2">
                  How It Works — Talking Points for Your Business Subject Presentation
                </h3>
                <p className="text-xs text-[#a6adc8]">
                  Use these key points when presenting BubbleDirStat to explain how it improves upon legacy disk usage tools like WinDirStat:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
                  <div className="text-xs font-mono text-[#f9e2af]">01. Visual Ergonomics</div>
                  <h4 className="text-sm font-bold text-[#cdd6f4]">
                    Bubbles vs. Nested Treemaps
                  </h4>
                  <p className="text-xs text-[#a6adc8] leading-relaxed">
                    WinDirStat uses nested rectangles (treemaps) which become visually cluttered with thousands of tiny slivers. BubbleDirStat focuses on the current directory level, placing the largest storage hogs dead-center and spiraling smaller items outward so users immediately spot what is consuming disk space.
                  </p>
                </div>

                <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
                  <div className="text-xs font-mono text-[#cba6f7]">02. Targeted Filtering</div>
                  <h4 className="text-sm font-bold text-[#cdd6f4]">
                    Both / Files Only / Directories Only
                  </h4>
                  <p className="text-xs text-[#a6adc8] leading-relaxed">
                    Traditional disk analyzers mix loose files and folders together. BubbleDirStat lets users isolate only loose files or only subdirectories with a single click in the top bar, recalculating relative storage percentages on the fly.
                  </p>
                </div>

                <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
                  <div className="text-xs font-mono text-[#a6e3a1]">03. Mathematical Scaling</div>
                  <h4 className="text-sm font-bold text-[#cdd6f4]">
                    Area-Proportional Radius (r ∝ √Size)
                  </h4>
                  <p className="text-xs text-[#a6adc8] leading-relaxed">
                    Because a circle&apos;s area is A = πr², scaling the radius by the square root of the file size ensures the visual area of each bubble accurately reflects its relative storage footprint while keeping smaller files clickable.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#181825] border border-[#313244] rounded-lg space-y-2">
                <h4 className="text-sm font-bold text-[#cdd6f4]">
                  Optional: Packaging as a Standalone Windows `.exe` or macOS `.app`
                </h4>
                <p className="text-xs text-[#a6adc8]">
                  If you want to run BubbleDirStat on a classroom presentation computer without opening an IDE, you can bundle <code className="text-[#f9e2af]">bubbledirstat.py</code> into a single double-clickable desktop executable using PyInstaller:
                </p>
                <pre className="p-3 bg-[#11111b] border border-[#313244] rounded text-xs font-mono text-[#a6e3a1] overflow-x-auto">
                  <code>pip install pyinstaller{'\n'}pyinstaller --onefile --windowed --name BubbleDirStat bubbledirstat.py</code>
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
