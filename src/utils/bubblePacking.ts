export type FileCategory =
  | 'Directory'
  | 'Media'
  | 'Document'
  | 'Archive/App'
  | 'Code/Data'
  | 'Other File'
  | 'Grouped';

export type FilterMode = 'Both' | 'Files' | 'Directories';

export interface CategoryColorSpec {
  fill: string;
  outline: string;
  text: string;
}

export const CATEGORY_COLORS: Record<FileCategory, CategoryColorSpec> = {
  Directory:     { fill: '#f9e2af', outline: '#f38ba8', text: '#11111b' }, // Warm Gold
  Media:         { fill: '#cba6f7', outline: '#b4befe', text: '#11111b' }, // Purple (Video/Audio/Img)
  Document:      { fill: '#89b4fa', outline: '#74c7ec', text: '#11111b' }, // Blue (PDF/Doc/Xls)
  'Archive/App': { fill: '#f38ba8', outline: '#eba0ac', text: '#11111b' }, // Red/Pink (Zip/Exe/Iso)
  'Code/Data':   { fill: '#a6e3a1', outline: '#94e2d5', text: '#11111b' }, // Green (Py/JS/JSON/CSV)
  'Other File':  { fill: '#9399b2', outline: '#bac2de', text: '#11111b' }, // Slate Grey
  Grouped:       { fill: '#585b70', outline: '#7f849c', text: '#cdd6f4' }, // Smaller items grouped
};

const EXT_MAP: Record<Exclude<FileCategory, 'Directory' | 'Other File' | 'Grouped'>, Set<string>> = {
  Media: new Set(['.mp4', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.flac', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']),
  Document: new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.rtf']),
  'Archive/App': new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.exe', '.msi', '.dmg', '.iso', '.apk', '.dll']),
  'Code/Data': new Set(['.py', '.js', '.ts', '.tsx', '.html', '.css', '.cpp', '.c', '.java', '.json', '.xml', '.csv', '.sql', '.db']),
};

export interface RawDirItem {
  name: string;
  path: string | null;
  is_dir: boolean;
  size: number;
  category: FileCategory;
}

export interface RankedDirItem extends RawDirItem {
  rank: number;
  pct: number;
}

export interface PackedBubble extends RankedDirItem {
  r: number;
  x: number;
  y: number;
  sx?: number;
  sy?: number;
  sr?: number;
}

export function getFileCategory(filename: string, isDir: boolean): FileCategory {
  if (isDir) {
    return 'Directory';
  }
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : '';
  for (const [category, extensions] of Object.entries(EXT_MAP)) {
    if (extensions.has(ext)) {
      return category as FileCategory;
    }
  }
  return 'Other File';
}

export function formatSize(sizeBytes: number): string {
  if (sizeBytes <= 0 || !Number.isFinite(sizeBytes)) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(sizeBytes) / Math.log(1024)), units.length - 1);
  const p = Math.pow(1024, i);
  const s = Number((sizeBytes / p).toFixed(2));
  return `${s} ${units[i]}`;
}

export interface FilteredResult {
  rankedItems: RankedDirItem[];
  bubbleInputItems: RankedDirItem[];
  totalSize: number;
}

export const MAX_BUBBLES = 55;

export function filterAndRankItems(rawItems: RawDirItem[], mode: FilterMode): FilteredResult {
  let filtered: RawDirItem[];
  if (mode === 'Files') {
    filtered = rawItems.filter((item) => !item.is_dir);
  } else if (mode === 'Directories') {
    filtered = rawItems.filter((item) => item.is_dir);
  } else {
    filtered = [...rawItems];
  }

  filtered.sort((a, b) => b.size - a.size);
  const totalSize = filtered.reduce((acc, item) => acc + item.size, 0);

  const rankedItems: RankedDirItem[] = filtered.map((item, idx) => ({
    ...item,
    rank: idx,
    pct: totalSize > 0 ? (item.size / totalSize) * 100 : 0,
  }));

  let bubbleInputItems: RankedDirItem[];
  if (rankedItems.length > MAX_BUBBLES) {
    const topItems = rankedItems.slice(0, MAX_BUBBLES - 1).map((x) => ({ ...x }));
    const remainder = rankedItems.slice(MAX_BUBBLES - 1);
    const remSize = remainder.reduce((acc, x) => acc + x.size, 0);
    topItems.push({
      name: `[${remainder.length} Smaller Items]`,
      path: null,
      is_dir: false,
      size: remSize,
      category: 'Grouped',
      rank: MAX_BUBBLES - 1,
      pct: totalSize > 0 ? (remSize / totalSize) * 100 : 0,
    });
    bubbleInputItems = topItems;
  } else {
    bubbleInputItems = rankedItems.map((x) => ({ ...x }));
  }

  return {
    rankedItems,
    bubbleInputItems,
    totalSize,
  };
}

/**
 * Packs bubbles using the exact Golden-Angle Spiral Packing algorithm from BubbleDirStat.
 * Radius is proportional to sqrt(size) so bubble AREA represents file/folder size.
 */
export function computeBubbleLayout(items: RankedDirItem[], totalSize: number): PackedBubble[] {
  if (!items || items.length === 0) {
    return [];
  }

  const maxSize = Math.max(...items.map((item) => item.size));
  const minR = 16.0;
  const maxR = 115.0;
  const padding = 5.0;

  const placed: PackedBubble[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let r: number;
    if (maxSize > 0) {
      const norm = Math.sqrt(item.size / maxSize);
      r = minR + (maxR - minR) * norm;
    } else {
      r = 28.0;
    }

    const pct = totalSize > 0 ? (item.size / totalSize) * 100 : 0.0;

    if (i === 0) {
      placed.push({
        ...item,
        r,
        x: 0.0,
        y: 0.0,
        pct,
        rank: i,
      });
    } else {
      let dist = placed[0].r + r + padding;
      const goldenAngle = i * 2.3999632;
      let foundSpot = false;

      while (!foundSpot) {
        const steps = Math.max(14, Math.floor((2 * Math.PI * dist) / 10.0));
        for (let step = 0; step < steps; step++) {
          const angle = goldenAngle + (2 * Math.PI * step) / steps;
          const cx = dist * Math.cos(angle);
          const cy = dist * Math.sin(angle);

          let collision = false;
          for (const p of placed) {
            const dx = cx - p.x;
            const dy = cy - p.y;
            const minDist = r + p.r + padding;
            if (dx * dx + dy * dy < minDist * minDist) {
              collision = true;
              break;
            }
          }

          if (!collision) {
            placed.push({
              ...item,
              r,
              x: cx,
              y: cy,
              pct,
              rank: i,
            });
            foundSpot = true;
            break;
          }
        }
        dist += 6.0;
      }
    }
  }

  return placed;
}

export function scaleBubblesToViewport(
  bubbles: PackedBubble[],
  width: number,
  height: number,
  margin = 35.0
): PackedBubble[] {
  if (bubbles.length === 0 || width < 50 || height < 50) {
    return [];
  }

  const minX = Math.min(...bubbles.map((b) => b.x - b.r));
  const maxX = Math.max(...bubbles.map((b) => b.x + b.r));
  const minY = Math.min(...bubbles.map((b) => b.y - b.r));
  const maxY = Math.max(...bubbles.map((b) => b.y + b.r));

  const packW = Math.max(1.0, maxX - minX);
  const packH = Math.max(1.0, maxY - minY);

  const scale = Math.min((width - 2 * margin) / packW, (height - 2 * margin) / packH);
  const centerX = (minX + maxX) / 2.0;
  const centerY = (minY + maxY) / 2.0;

  return bubbles.map((b) => ({
    ...b,
    sx: width / 2.0 + (b.x - centerX) * scale,
    sy: height / 2.0 + (b.y - centerY) * scale,
    sr: Math.max(4.0, b.r * scale),
  }));
}

export function getParentPath(currentPath: string): string | null {
  const normalized = currentPath.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!normalized || normalized === '/' || /^[A-Za-z]:$/.test(normalized)) {
    return null;
  }
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return null;
  }
  if (lastSlash === 0) {
    return '/';
  }
  const parent = normalized.slice(0, lastSlash);
  return parent;
}

/**
 * Deletes a file item from a directory map at currentPath and subtracts its size from ancestor directory entries.
 */
export function deleteFileFromDirectoryMap(
  directoryMap: Record<string, RawDirItem[]>,
  currentPath: string,
  targetFile: RawDirItem
): Record<string, RawDirItem[]> {
  if (targetFile.is_dir || targetFile.category === 'Grouped') {
    return directoryMap;
  }

  const currentItems = directoryMap[currentPath];
  if (!currentItems) {
    return directoryMap;
  }

  const exists = currentItems.some(
    (item) => !item.is_dir && item.name === targetFile.name && item.path === targetFile.path
  );
  if (!exists) {
    return directoryMap;
  }

  const nextMap: Record<string, RawDirItem[]> = {
    ...directoryMap,
    [currentPath]: currentItems.filter(
      (item) => !(item.name === targetFile.name && item.path === targetFile.path && !item.is_dir)
    ),
  };

  // Propagate freed size up ancestor directories so parent folder bubbles stay accurate
  let childDirPath = currentPath;
  let parentDirPath = getParentPath(childDirPath);
  while (parentDirPath && nextMap[parentDirPath]) {
    nextMap[parentDirPath] = nextMap[parentDirPath].map((entry) => {
      if (entry.is_dir && entry.path === childDirPath) {
        return {
          ...entry,
          size: Math.max(0, entry.size - targetFile.size),
        };
      }
      return entry;
    });
    childDirPath = parentDirPath;
    parentDirPath = getParentPath(childDirPath);
  }

  return nextMap;
}

/**
 * Deletes an entire directory item (and any nested subdirectories) from a directory map at currentPath,
 * and subtracts its size from ancestor directory entries.
 */
export function deleteDirectoryFromDirectoryMap(
  directoryMap: Record<string, RawDirItem[]>,
  currentPath: string,
  targetDir: RawDirItem
): Record<string, RawDirItem[]> {
  if (!targetDir.is_dir || !targetDir.path) {
    return directoryMap;
  }

  const currentItems = directoryMap[currentPath];
  if (!currentItems) {
    return directoryMap;
  }

  const exists = currentItems.some(
    (item) => item.is_dir && item.name === targetDir.name && item.path === targetDir.path
  );
  if (!exists) {
    return directoryMap;
  }

  const nextMap: Record<string, RawDirItem[]> = {};
  const targetPrefix = `${targetDir.path}/`;

  for (const [dirKey, items] of Object.entries(directoryMap)) {
    if (dirKey === targetDir.path || dirKey.startsWith(targetPrefix)) {
      continue;
    }
    if (dirKey === currentPath) {
      nextMap[dirKey] = items.filter(
        (item) => !(item.is_dir && item.name === targetDir.name && item.path === targetDir.path)
      );
    } else {
      nextMap[dirKey] = items;
    }
  }

  // Propagate freed size up ancestor directories
  let childDirPath = currentPath;
  let parentDirPath = getParentPath(childDirPath);
  while (parentDirPath && nextMap[parentDirPath]) {
    nextMap[parentDirPath] = nextMap[parentDirPath].map((entry) => {
      if (entry.is_dir && entry.path === childDirPath) {
        return {
          ...entry,
          size: Math.max(0, entry.size - targetDir.size),
        };
      }
      return entry;
    });
    childDirPath = parentDirPath;
    parentDirPath = getParentPath(childDirPath);
  }

  return nextMap;
}


