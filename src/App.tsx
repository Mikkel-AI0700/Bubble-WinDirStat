import React, { useMemo, useState } from 'react';
import { ArrowUp, Folder, FileText, FolderOpen, RotateCw, Trash2, Undo2 } from 'lucide-react';
import {
  CATEGORY_COLORS,
  computeBubbleLayout,
  deleteDirectoryFromDirectoryMap,
  deleteFileFromDirectoryMap,
  filterAndRankItems,
  FilterMode,
  formatSize,
  getParentPath,
  RankedDirItem,
  RawDirItem,
} from './utils/bubblePacking';
import {
  buildVirtualTreeFromFileList,
  PRESET_DRIVES,
  VIRTUAL_DIRECTORIES,
} from './data/virtualFileSystem';
import { BubbleCanvas } from './components/BubbleCanvas';
import { BrowseFolderModal } from './components/BrowseFolderModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { PythonCodeModal } from './components/PythonCodeModal';

const DEFAULT_PATH = PRESET_DRIVES[0].rootPath;

export default function App() {
  const [directoryMap, setDirectoryMap] = useState<Record<string, RawDirItem[]>>(
    () => ({ ...VIRTUAL_DIRECTORIES })
  );
  const [currentPath, setCurrentPath] = useState<string>(DEFAULT_PATH);
  const [pathInput, setPathInput] = useState<string>(DEFAULT_PATH);
  const [pathError, setPathError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('Both');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);
  const [lastDeletedSnapshot, setLastDeletedSnapshot] = useState<{
    map: Record<string, RawDirItem[]>;
    fileName: string;
  } | null>(null);

  const [hoveredRank, setHoveredRank] = useState<number | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<RankedDirItem | null>(null);

  const [isBrowseOpen, setIsBrowseOpen] = useState<boolean>(false);
  const [pythonModalState, setPythonModalState] = useState<{
    open: boolean;
    tab: 'code' | 'presentation';
  }>({ open: false, tab: 'code' });

  const rawItems = useMemo(() => {
    return directoryMap[currentPath] || [];
  }, [directoryMap, currentPath]);

  const { rankedItems, bubbleInputItems, totalSize } = useMemo(() => {
    return filterAndRankItems(rawItems, filterMode);
  }, [rawItems, filterMode]);

  const bubbles = useMemo(() => {
    return computeBubbleLayout(bubbleInputItems, totalSize);
  }, [bubbleInputItems, totalSize]);

  const selectedItem = useMemo(() => {
    if (selectedRank === null) return null;
    return (
      rankedItems.find((item) => item.rank === selectedRank) ||
      bubbles.find((b) => b.rank === selectedRank) ||
      null
    );
  }, [selectedRank, rankedItems, bubbles]);

  // Prioritize selectedRank when an item is clicked so moving the cursor to the Delete button never loses the selected item
  const activeInspectorRank = selectedRank !== null ? selectedRank : hoveredRank;
  const inspectedItem = useMemo(() => {
    if (activeInspectorRank === null) return null;
    return (
      bubbles.find((b) => b.rank === activeInspectorRank) ||
      rankedItems.find((item) => item.rank === activeInspectorRank) ||
      null
    );
  }, [activeInspectorRank, bubbles, rankedItems]);

  const canDeleteSelectedFile = Boolean(
    selectedItem && !selectedItem.is_dir && selectedItem.category !== 'Grouped'
  );

  const canDeleteSelectedDir = Boolean(
    selectedItem && selectedItem.is_dir && selectedItem.path
  );

  const handleRequestDeleteFile = () => {
    if (!selectedItem || selectedItem.is_dir || selectedItem.category === 'Grouped') {
      return;
    }
    setPendingDeleteItem(selectedItem);
  };

  const handleRequestDeleteDirectory = () => {
    if (!selectedItem || !selectedItem.is_dir || !selectedItem.path) {
      return;
    }
    setPendingDeleteItem(selectedItem);
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteItem) return;

    setLastDeletedSnapshot({
      map: directoryMap,
      fileName: pendingDeleteItem.name,
    });

    if (pendingDeleteItem.is_dir) {
      const nextMap = deleteDirectoryFromDirectoryMap(
        directoryMap,
        currentPath,
        pendingDeleteItem
      );
      setDirectoryMap(nextMap);
      setStatusAnnouncement(
        `Deleted directory '${pendingDeleteItem.name}' (${formatSize(pendingDeleteItem.size)} freed).`
      );
    } else {
      const nextMap = deleteFileFromDirectoryMap(
        directoryMap,
        currentPath,
        pendingDeleteItem
      );
      setDirectoryMap(nextMap);
      setStatusAnnouncement(
        `Deleted file '${pendingDeleteItem.name}' (${formatSize(pendingDeleteItem.size)} freed).`
      );
    }

    setPendingDeleteItem(null);
    setSelectedRank(null);
    setHoveredRank(null);
  };

  const handleUndoDelete = () => {
    if (!lastDeletedSnapshot) return;
    setDirectoryMap(lastDeletedSnapshot.map);
    setStatusAnnouncement(`Restored '${lastDeletedSnapshot.fileName}'.`);
    setLastDeletedSnapshot(null);
  };

  const availablePaths = useMemo(() => {
    return Object.keys(directoryMap).sort();
  }, [directoryMap]);

  const navigateToPath = (targetPath: string, customMap?: Record<string, RawDirItem[]>) => {
    const cleanTarget = targetPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
    const activeMap = customMap || directoryMap;

    if (!cleanTarget || !activeMap[cleanTarget]) {
      setPathError(`Directory not found: "${targetPath}". Choose an indexed path or browse folders.`);
      return;
    }

    setPathError(null);
    setStatusAnnouncement(null);
    setCurrentPath(cleanTarget);
    setPathInput(cleanTarget);
    setHoveredRank(null);
    setSelectedRank(null);
  };

  const handleGoUp = () => {
    const parent = getParentPath(currentPath);
    if (parent && directoryMap[parent]) {
      navigateToPath(parent);
    }
  };

  const handleRescan = () => {
    setPathError(null);
    setStatusAnnouncement(null);
    setIsScanning(true);
    setHoveredRank(null);
    setSelectedRank(null);
    window.setTimeout(() => {
      setIsScanning(false);
    }, 120);
  };

  const handleUploadLocalFolder = (files: FileList) => {
    const { rootPath, tree } = buildVirtualTreeFromFileList(files);
    const merged = { ...directoryMap, ...tree };
    setDirectoryMap(merged);
    navigateToPath(rootPath, merged);
  };

  const canGoUp = useMemo(() => {
    const parent = getParentPath(currentPath);
    return Boolean(parent && directoryMap[parent]);
  }, [currentPath, directoryMap]);

  const statusText = isScanning
    ? `Scanning '${currentPath}'... Please wait.`
    : statusAnnouncement ||
      `Scan complete. Showing ${rankedItems.length} items in '${currentPath}'.`;

  return (
    <div className="min-h-screen flex flex-col bg-[#11111b] text-[#cdd6f4]">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-[#181825] border-b border-[#313244]">
        {/* Zone 1: Brand Title (single text element) */}
        <a
          href="#workspace"
          onClick={(e) => {
            e.preventDefault();
            navigateToPath(DEFAULT_PATH);
          }}
          className="text-lg font-bold tracking-tight text-[#cdd6f4] whitespace-nowrap shrink-0"
        >
          BubbleDirStat
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#a6adc8]"
        >
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              navigateToPath(PRESET_DRIVES[0].rootPath);
            }}
            className="hover:text-[#cdd6f4] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Business Suite
          </a>
          <a
            href="#media-vault"
            onClick={(e) => {
              e.preventDefault();
              navigateToPath(PRESET_DRIVES[1].rootPath);
            }}
            className="hover:text-[#cdd6f4] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Media Vault
          </a>
          <a
            href="#python-workspace"
            onClick={(e) => {
              e.preventDefault();
              navigateToPath(PRESET_DRIVES[2].rootPath);
            }}
            className="hover:text-[#cdd6f4] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Python Workspace
          </a>
          <a
            href="#presentation-guide"
            onClick={(e) => {
              e.preventDefault();
              setPythonModalState({ open: true, tab: 'presentation' });
            }}
            className="hover:text-[#cdd6f4] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Presentation Guide
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setPythonModalState({ open: true, tab: 'code' })}
            className="px-4 py-2 text-xs font-bold text-[#11111b] bg-[#89b4fa] hover:bg-[#b4befe] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Get Python App (.py)
          </button>
        </div>
      </header>

      {/* Main Desktop App Workspace */}
      <main
        id="workspace"
        className="flex-1 flex flex-col max-w-[1440px] w-full mx-auto px-4 py-3 gap-2.5"
      >
        {/* 1. TOP CONTROL BAR (Matches BubbleDirStatApp._build_ui top_bar) */}
        <section
          aria-label="Directory navigation and view filters"
          className="bg-[#1e1e2e] border border-[#313244] rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
        >
          {/* Left Navigation Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBrowseOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#89b4fa] hover:bg-[#b4befe] text-[#11111b] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Browse Folder
            </button>

            <button
              type="button"
              onClick={handleGoUp}
              disabled={!canGoUp}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#313244] hover:bg-[#45475a] disabled:opacity-40 disabled:pointer-events-none text-[#cdd6f4] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              Up Level
            </button>

            <button
              type="button"
              onClick={handleRescan}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rescan
            </button>
          </div>

          {/* Center Path Entry */}
          <form
            className="flex-1 min-w-[240px] flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigateToPath(pathInput);
            }}
          >
            <label htmlFor="directory-path-input" className="sr-only">
              Current Directory Path
            </label>
            <input
              id="directory-path-input"
              type="text"
              value={pathInput}
              onChange={(e) => {
                setPathInput(e.target.value);
                if (pathError) setPathError(null);
              }}
              placeholder="Enter directory path..."
              className="w-full px-3 py-1.5 text-xs font-mono bg-[#181825] text-[#cdd6f4] border border-[#313244] focus:border-[#89b4fa] focus:outline-none rounded-md"
            />
          </form>

          {/* Right Filter View Radio / Segmented Controls */}
          <div
            role="group"
            aria-label="Filter View"
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-xs font-bold text-[#cdd6f4] whitespace-nowrap shrink-0">
              Filter View:
            </span>
            <div className="flex items-center gap-1 p-1 bg-[#181825] border border-[#313244] rounded-md">
              {(['Both', 'Files', 'Directories'] as FilterMode[]).map((mode) => {
                const active = filterMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setFilterMode(mode);
                      setHoveredRank(null);
                      setSelectedRank(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#89b4fa] text-[#11111b]'
                        : 'text-[#a6adc8] hover:text-[#cdd6f4]'
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Path Validation Feedback if user typed invalid path */}
        {pathError && (
          <div
            role="alert"
            className="px-3.5 py-2 text-xs bg-[#f38ba8]/15 border border-[#f38ba8]/40 text-[#f38ba8] rounded-md flex items-center justify-between"
          >
            <span>{pathError}</span>
            <button
              type="button"
              onClick={() => {
                setPathError(null);
                setPathInput(currentPath);
              }}
              className="underline font-semibold ml-4 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reset Path
            </button>
          </div>
        )}

        {/* 2. MAIN CONTENT AREA (Bubble Canvas on Left, Details & Ranked List on Right) */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2.5 min-h-[540px]">
          {/* Left: Bubble Canvas */}
          <BubbleCanvas
            bubbles={bubbles}
            isScanning={isScanning}
            hoveredRank={hoveredRank}
            selectedRank={selectedRank}
            onHoverBubble={setHoveredRank}
            onSelectBubble={setSelectedRank}
            onOpenDirectory={(dirPath) => navigateToPath(dirPath)}
          />

          {/* Right: Details & Ranked Table (360px on desktop matching Tkinter right_panel) */}
          <aside className="w-full lg:w-[370px] shrink-0 bg-[#1e1e2e] border border-[#313244] rounded-lg p-3.5 flex flex-col gap-3">
            {/* Directory Summary */}
            <div>
              <h2 className="text-sm font-bold text-[#89b4fa] mb-1.5">
                Directory Summary
              </h2>
              <div className="space-y-1 text-xs text-[#cdd6f4]">
                <div className="flex items-center justify-between">
                  <span className="text-[#a6adc8]">Filtered Total Size:</span>
                  <span
                    data-testid="summary-total-size"
                    className="font-mono font-semibold tabular-nums"
                  >
                    {formatSize(totalSize)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#a6adc8]">Items Displayed:</span>
                  <span
                    data-testid="summary-item-count"
                    className="font-mono font-semibold tabular-nums"
                  >
                    {rankedItems.length} ({filterMode})
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-[#313244]" />

            {/* Bubble Inspector */}
            <div className="min-h-[112px] flex flex-col justify-between">
              <div className="flex items-center justify-between h-6 mb-1">
                <h2 className="text-sm font-bold text-[#89b4fa]">
                  Bubble Inspector
                </h2>
                {inspectedItem && inspectedItem.is_dir && inspectedItem.path ? (
                  <button
                    type="button"
                    onClick={() => navigateToPath(inspectedItem.path!)}
                    className="px-2.5 py-0.5 text-xs font-bold bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Open Folder
                  </button>
                ) : (
                  <span className="text-[11px] text-[#a6adc8] font-mono">
                    {inspectedItem ? `#${inspectedItem.rank + 1}` : 'Idle'}
                  </span>
                )}
              </div>

              {inspectedItem ? (
                <div className="space-y-1 text-xs">
                  <div
                    data-testid="inspector-name"
                    className="font-bold text-[#cdd6f4] text-xs flex items-center gap-1.5 truncate"
                    title={inspectedItem.name}
                  >
                    {inspectedItem.is_dir ? (
                      <Folder className="w-3.5 h-3.5 text-[#f9e2af] shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[#89b4fa] shrink-0" />
                    )}
                    <span className="truncate">{inspectedItem.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a6adc8]">Category:</span>
                    <span className="font-medium text-[#cdd6f4] flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-xs"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[inspectedItem.category]?.fill || '#9399b2',
                        }}
                      />
                      {inspectedItem.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a6adc8]">Size:</span>
                    <span className="font-mono tabular-nums text-[#cdd6f4]">
                      {formatSize(inspectedItem.size)} ({inspectedItem.size.toLocaleString()} B)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a6adc8]">Share of View:</span>
                    <span className="font-mono font-semibold tabular-nums text-[#cdd6f4]">
                      {inspectedItem.pct.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div
                    data-testid="inspector-name"
                    className="font-bold text-[#cdd6f4] text-xs truncate"
                  >
                    Hover or click a bubble
                  </div>
                  <div className="flex items-center justify-between text-[#a6adc8]">
                    <span>Category:</span>
                    <span className="font-mono">--</span>
                  </div>
                  <div className="flex items-center justify-between text-[#a6adc8]">
                    <span>Size:</span>
                    <span className="font-mono">--</span>
                  </div>
                  <div className="flex items-center justify-between text-[#a6adc8]">
                    <span>Share of View:</span>
                    <span className="font-mono">--</span>
                  </div>
                </div>
              )}

              <div className="mt-2.5 flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={!canDeleteSelectedFile}
                  onClick={handleRequestDeleteFile}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
                    canDeleteSelectedFile
                      ? 'bg-[#f38ba8] hover:bg-[#eba0ac] text-[#11111b] cursor-pointer'
                      : 'bg-[#313244] text-[#6c7086] cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected File
                </button>

                <button
                  type="button"
                  disabled={!canDeleteSelectedDir}
                  onClick={handleRequestDeleteDirectory}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 ${
                    canDeleteSelectedDir
                      ? 'bg-[#f38ba8] hover:bg-[#eba0ac] text-[#11111b] cursor-pointer'
                      : 'bg-[#313244] text-[#6c7086] cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected Directory
                </button>
              </div>
            </div>

            <hr className="border-[#313244]" />

            {/* Size Ranking Table (Treeview equivalent) */}
            <div className="flex-1 flex flex-col min-h-0">
              <h2 className="text-sm font-bold text-[#89b4fa] mb-2">
                Size Ranking (Double-click folder to open)
              </h2>

              <div className="flex-1 bg-[#181825] border border-[#313244] rounded-md overflow-hidden flex flex-col min-h-[220px]">
                <div className="overflow-y-auto flex-1 max-h-[320px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#1e1e2e] text-[#cdd6f4] border-b border-[#313244] sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2.5 font-bold">Name</th>
                        <th className="py-2 px-2 font-bold w-16">Type</th>
                        <th className="py-2 px-2 font-bold text-right w-20">Size</th>
                        <th className="py-2 px-2.5 font-bold text-right w-14">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#313244]/40">
                      {rankedItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 px-4 text-center text-[#a6adc8]"
                          >
                            No items match the current filter.
                          </td>
                        </tr>
                      ) : (
                        rankedItems.map((item) => {
                          const isSelected = selectedRank === item.rank;
                          const isHovered = hoveredRank === item.rank;
                          return (
                            <tr
                              key={`${item.rank}-${item.name}`}
                              tabIndex={0}
                              aria-selected={isSelected}
                              onClick={() => setSelectedRank(item.rank)}
                              onDoubleClick={() => {
                                if (item.is_dir && item.path) {
                                  navigateToPath(item.path);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (item.is_dir && item.path && isSelected) {
                                    navigateToPath(item.path);
                                  } else {
                                    setSelectedRank(item.rank);
                                  }
                                }
                              }}
                              onMouseEnter={() => setHoveredRank(item.rank)}
                              onMouseLeave={() => setHoveredRank(null)}
                              className={`transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#89b4fa] ${
                                item.is_dir ? 'cursor-pointer' : 'cursor-default'
                              } ${
                                isSelected
                                  ? 'bg-[#45475a] text-[#cdd6f4]'
                                  : isHovered
                                  ? 'bg-[#313244]/70 text-[#cdd6f4]'
                                  : 'text-[#cdd6f4] hover:bg-[#313244]/50'
                              }`}
                            >
                              <td className="py-1.5 px-2.5 font-medium truncate max-w-[140px]">
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  <span
                                    className="inline-block w-2 h-2 rounded-xs shrink-0"
                                    style={{
                                      backgroundColor:
                                        CATEGORY_COLORS[item.category]?.fill || '#9399b2',
                                    }}
                                  />
                                  <span className="truncate">{item.name}</span>
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-[#a6adc8] whitespace-nowrap">
                                {item.is_dir ? 'Folder' : 'File'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                                {formatSize(item.size)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                                {item.pct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* 3. BOTTOM STATUS BAR */}
        <footer className="bg-[#1e1e2e] border border-[#313244] rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#a6adc8]">
          <div className="flex items-center gap-3 min-w-0">
            <span data-testid="status-bar-text" className="truncate">
              {statusText}
            </span>
            {lastDeletedSnapshot && (
              <button
                type="button"
                onClick={handleUndoDelete}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Undo2 className="w-3 h-3 text-[#a6e3a1]" />
                Undo Delete
              </button>
            )}
          </div>
          <span className="whitespace-nowrap">
            Tip: Click any file to enable Delete Selected File, or double-click a Directory bubble to open it.
          </span>
        </footer>
      </main>

      {/* Modals */}
      <ConfirmDeleteModal
        item={pendingDeleteItem}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={handleConfirmDelete}
      />

      <BrowseFolderModal
        isOpen={isBrowseOpen}
        currentPath={currentPath}
        availablePaths={availablePaths}
        onClose={() => setIsBrowseOpen(false)}
        onSelectPath={(path) => navigateToPath(path)}
        onUploadLocalFolder={handleUploadLocalFolder}
      />

      <PythonCodeModal
        isOpen={pythonModalState.open}
        initialTab={pythonModalState.tab}
        onClose={() => setPythonModalState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
