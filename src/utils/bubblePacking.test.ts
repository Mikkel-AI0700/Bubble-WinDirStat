import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFileCategory,
  formatSize,
  filterAndRankItems,
  computeBubbleLayout,
  scaleBubblesToViewport,
  getParentPath,
  deleteFileFromDirectoryMap,
  deleteDirectoryFromDirectoryMap,
  MAX_BUBBLES,
  RawDirItem,
} from './bubblePacking';

test('getFileCategory classifies directories and extensions accurately', () => {
  assert.equal(getFileCategory('Documents', true), 'Directory');
  assert.equal(getFileCategory('demo_video.MP4', false), 'Media');
  assert.equal(getFileCategory('financial_model.xlsx', false), 'Document');
  assert.equal(getFileCategory('release_build.zip', false), 'Archive/App');
  assert.equal(getFileCategory('bubbledirstat.py', false), 'Code/Data');
  assert.equal(getFileCategory('unknown.xyz', false), 'Other File');
});

test('formatSize converts bytes to human-readable units matching Python format_size', () => {
  assert.equal(formatSize(0), '0 B');
  assert.equal(formatSize(-10), '0 B');
  assert.equal(formatSize(512), '512 B');
  assert.equal(formatSize(1024), '1 KB');
  assert.equal(formatSize(1536), '1.5 KB');
  assert.equal(formatSize(1048576 * 2.5), '2.5 MB');
  assert.equal(formatSize(1073741824 * 1.25), '1.25 GB');
});

test('filterAndRankItems filters by Both, Files, and Directories and computes relative shares', () => {
  const sampleItems: RawDirItem[] = [
    { name: 'Videos', path: '/root/Videos', is_dir: true, size: 600, category: 'Directory' },
    { name: 'report.pdf', path: '/root/report.pdf', is_dir: false, size: 300, category: 'Document' },
    { name: 'notes.txt', path: '/root/notes.txt', is_dir: false, size: 100, category: 'Document' },
  ];

  const both = filterAndRankItems(sampleItems, 'Both');
  assert.equal(both.rankedItems.length, 3);
  assert.equal(both.totalSize, 1000);
  assert.equal(both.rankedItems[0].name, 'Videos');
  assert.equal(both.rankedItems[0].pct, 60);

  const filesOnly = filterAndRankItems(sampleItems, 'Files');
  assert.equal(filesOnly.rankedItems.length, 2);
  assert.equal(filesOnly.totalSize, 400);
  assert.equal(filesOnly.rankedItems[0].name, 'report.pdf');
  assert.equal(filesOnly.rankedItems[0].pct, 75);

  const dirsOnly = filterAndRankItems(sampleItems, 'Directories');
  assert.equal(dirsOnly.rankedItems.length, 1);
  assert.equal(dirsOnly.totalSize, 600);
  assert.equal(dirsOnly.rankedItems[0].name, 'Videos');
  assert.equal(dirsOnly.rankedItems[0].pct, 100);
});

test('filterAndRankItems groups excess items beyond MAX_BUBBLES (55)', () => {
  const manyItems: RawDirItem[] = Array.from({ length: 65 }, (_, idx) => ({
    name: `file_${idx}.txt`,
    path: `/root/file_${idx}.txt`,
    is_dir: false,
    size: (65 - idx) * 100,
    category: 'Document',
  }));

  const res = filterAndRankItems(manyItems, 'Both');
  assert.equal(res.rankedItems.length, 65);
  assert.equal(res.bubbleInputItems.length, MAX_BUBBLES);
  const lastBubble = res.bubbleInputItems[MAX_BUBBLES - 1];
  assert.equal(lastBubble.category, 'Grouped');
  assert.equal(lastBubble.name, '[11 Smaller Items]');
});

test('computeBubbleLayout places largest bubble at origin and packs without overlap', () => {
  const items: RawDirItem[] = [
    { name: 'BigFolder', path: '/a', is_dir: true, size: 10000, category: 'Directory' },
    { name: 'MedVideo.mp4', path: '/b', is_dir: false, size: 4000, category: 'Media' },
    { name: 'SmallDoc.pdf', path: '/c', is_dir: false, size: 1000, category: 'Document' },
    { name: 'Script.py', path: '/d', is_dir: false, size: 250, category: 'Code/Data' },
  ];
  const { bubbleInputItems, totalSize } = filterAndRankItems(items, 'Both');
  const packed = computeBubbleLayout(bubbleInputItems, totalSize);

  assert.equal(packed.length, 4);
  assert.equal(packed[0].x, 0);
  assert.equal(packed[0].y, 0);
  assert.ok(packed[0].r > packed[1].r);
  assert.ok(packed[1].r > packed[2].r);

  // Verify no pair of bubbles overlaps
  for (let i = 0; i < packed.length; i++) {
    for (let j = i + 1; j < packed.length; j++) {
      const dx = packed[i].x - packed[j].x;
      const dy = packed[i].y - packed[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      assert.ok(dist >= packed[i].r + packed[j].r, `Bubbles ${i} and ${j} should not overlap`);
    }
  }

  const scaled = scaleBubblesToViewport(packed, 800, 600);
  assert.equal(scaled.length, 4);
  assert.ok(typeof scaled[0].sx === 'number' && scaled[0].sr! > 0);
});

test('getParentPath resolves parent directories across Windows and POSIX paths', () => {
  assert.equal(
    getParentPath('C:/Users/GroupPresentation/Business_Analytics_Suite'),
    'C:/Users/GroupPresentation'
  );
  assert.equal(getParentPath('C:/Users'), 'C:');
  assert.equal(getParentPath('C:'), null);
  assert.equal(getParentPath('/app/applet/src'), '/app/applet');
  assert.equal(getParentPath('/'), null);
});

test('deleteFileFromDirectoryMap removes selected file and updates parent folder sizes', () => {
  const fileToDelete: RawDirItem = {
    name: 'video.mp4',
    path: '/root/sub/video.mp4',
    is_dir: false,
    size: 400,
    category: 'Media',
  };
  const keepFile: RawDirItem = {
    name: 'doc.pdf',
    path: '/root/sub/doc.pdf',
    is_dir: false,
    size: 100,
    category: 'Document',
  };
  const subFolderInRoot: RawDirItem = {
    name: 'sub',
    path: '/root/sub',
    is_dir: true,
    size: 500,
    category: 'Directory',
  };

  const initialMap: Record<string, RawDirItem[]> = {
    '/root': [subFolderInRoot],
    '/root/sub': [fileToDelete, keepFile],
  };

  // Attempting to delete a directory should be a no-op
  const afterDirAttempt = deleteFileFromDirectoryMap(initialMap, '/root', subFolderInRoot);
  assert.equal(afterDirAttempt['/root'].length, 1);

  // Deleting a file removes it from current directory and subtracts its size from parent '/root'
  const updatedMap = deleteFileFromDirectoryMap(initialMap, '/root/sub', fileToDelete);
  assert.equal(updatedMap['/root/sub'].length, 1);
  assert.equal(updatedMap['/root/sub'][0].name, 'doc.pdf');
  assert.equal(updatedMap['/root'][0].size, 100);
});

test('deleteDirectoryFromDirectoryMap removes selected directory, nested subdirectories, and updates ancestor sizes', () => {
  const dirToDelete: RawDirItem = {
    name: 'Marketing_Video_Assets',
    path: '/drive/suite/Marketing_Video_Assets',
    is_dir: true,
    size: 700,
    category: 'Directory',
  };
  const keepFile: RawDirItem = {
    name: 'ledger.xlsx',
    path: '/drive/suite/ledger.xlsx',
    is_dir: false,
    size: 300,
    category: 'Document',
  };
  const suiteInDrive: RawDirItem = {
    name: 'suite',
    path: '/drive/suite',
    is_dir: true,
    size: 1000,
    category: 'Directory',
  };

  const initialMap: Record<string, RawDirItem[]> = {
    '/drive': [suiteInDrive],
    '/drive/suite': [dirToDelete, keepFile],
    '/drive/suite/Marketing_Video_Assets': [
      {
        name: 'raw',
        path: '/drive/suite/Marketing_Video_Assets/raw',
        is_dir: true,
        size: 700,
        category: 'Directory',
      },
    ],
    '/drive/suite/Marketing_Video_Assets/raw': [
      {
        name: 'clip.mov',
        path: '/drive/suite/Marketing_Video_Assets/raw/clip.mov',
        is_dir: false,
        size: 700,
        category: 'Media',
      },
    ],
  };

  // Passing a file to deleteDirectoryFromDirectoryMap is a no-op
  const afterFileAttempt = deleteDirectoryFromDirectoryMap(initialMap, '/drive/suite', keepFile);
  assert.equal(afterFileAttempt['/drive/suite'].length, 2);

  // Deleting the directory removes it from '/drive/suite', deletes nested keys, and updates '/drive' size
  const updatedMap = deleteDirectoryFromDirectoryMap(initialMap, '/drive/suite', dirToDelete);
  assert.equal(updatedMap['/drive/suite'].length, 1);
  assert.equal(updatedMap['/drive/suite'][0].name, 'ledger.xlsx');
  assert.equal(updatedMap['/drive/suite/Marketing_Video_Assets'], undefined);
  assert.equal(updatedMap['/drive/suite/Marketing_Video_Assets/raw'], undefined);
  assert.equal(updatedMap['/drive'][0].size, 300);
});


