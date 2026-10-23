import { getFileCategory, RawDirItem } from '../utils/bubblePacking';

export interface VirtualDirPreset {
  id: string;
  label: string;
  rootPath: string;
  description: string;
}

export const PRESET_DRIVES: VirtualDirPreset[] = [
  {
    id: 'business-suite',
    label: 'Business Analytics Suite (C:)',
    rootPath: 'C:/Users/GroupPresentation/Business_Analytics_Suite',
    description: 'Corporate presentation workspace with financial models, 4K media assets, datasets, and desktop builds.',
  },
  {
    id: 'media-vault',
    label: 'Production Media Vault (D:)',
    rootPath: 'D:/Production_Media_Vault',
    description: 'High-volume video editing masters, raw audio stems, brand design systems, and archive bundles.',
  },
  {
    id: 'eng-workspace',
    label: 'Engineering & Python Project (E:)',
    rootPath: 'E:/Python_Desktop_Workspace',
    description: 'BubbleDirStat desktop application source, PyInstaller dist bundles, SQLite datasets, and test fixtures.',
  },
];

function makeItem(parentPath: string, name: string, isDir: boolean, size: number): RawDirItem {
  const cleanParent = parentPath.replace(/\/+$/, '');
  const fullPath = `${cleanParent}/${name}`;
  return {
    name,
    path: fullPath,
    is_dir: isDir,
    size,
    category: getFileCategory(name, isDir),
  };
}

export const VIRTUAL_DIRECTORIES: Record<string, RawDirItem[]> = {
  'C:': [
    makeItem('C:', 'Users', true, 4_892_450_816),
    makeItem('C:', 'Program_Files_Enterprise', true, 2_140_000_000),
    makeItem('C:', 'Windows_System_Cache', true, 1_620_000_000),
    makeItem('C:', 'hiberfil.sys', false, 850_000_000),
    makeItem('C:', 'pagefile.sys', false, 640_000_000),
  ],
  'C:/Users': [
    makeItem('C:/Users', 'GroupPresentation', true, 4_582_450_816),
    makeItem('C:/Users', 'Shared_Public_Assets', true, 310_000_000),
    makeItem('C:/Users', 'desktop_sync_index.db', false, 18_450_000),
  ],
  'C:/Users/GroupPresentation': [
    makeItem('C:/Users/GroupPresentation', 'Business_Analytics_Suite', true, 3_942_150_400),
    makeItem('C:/Users/GroupPresentation', 'Downloads_Archive', true, 615_300_416),
    makeItem('C:/Users/GroupPresentation', 'Team_Presentation_Script.docx', false, 14_500_000),
    makeItem('C:/Users/GroupPresentation', 'Speaker_Notes_Final.pdf', false, 10_500_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Marketing_Video_Assets', true, 1_420_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Customer_Data_Warehouse', true, 865_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Product_Prototype_Builds', true, 540_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Q4_Financial_Models', true, 312_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Executive_Board_Decks', true, 198_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Legacy_Client_Backups', true, 145_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Keynote_Demo_Recording_4K.mp4', false, 215_400_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Enterprise_Snapshot_2026.zip', false, 118_500_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'FY2026_Consolidated_Ledger.xlsx', false, 54_200_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Global_Supply_Telemetry.csv', false, 38_900_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Market_Research_Compendium.pdf', false, 21_400_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'System_Memory_Dump.dmp', false, 11_200_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'Brand_Identity_Banner.png', false, 2_480_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite', 'bubbledirstat.py', false, 28_400),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Raw_Camera_Red_Footage', true, 780_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Localized_Voiceovers', true, 195_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Product_Launch_Master_60fps.mp4', false, 265_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Customer_Testimonial_Reel.mov', false, 112_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Podcast_Keynote_Master.wav', false, 48_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets', 'Storyboard_Overview.pdf', false, 20_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Raw_Camera_Red_Footage': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Raw_Camera_Red_Footage', 'Take_01_Studio_Wide.mov', false, 340_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Raw_Camera_Red_Footage', 'Take_02_Macro_Hardware.mov', false, 290_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Raw_Camera_Red_Footage', 'Take_03_B_Roll_Office.mp4', false, 150_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Localized_Voiceovers': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Localized_Voiceovers', 'English_Master_Track.flac', false, 75_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Localized_Voiceovers', 'Japanese_Master_Track.flac', false, 68_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Marketing_Video_Assets/Localized_Voiceovers', 'Spanish_Master_Track.flac', false, 52_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse', 'Regional_Parquet_Shards', true, 410_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse', 'production_warehouse_2026.db', false, 245_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse', 'annual_transactions_export.csv', false, 134_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse', 'retention_cohort_analysis.json', false, 52_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse', 'etl_pipeline_transform.py', false, 24_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse/Regional_Parquet_Shards': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse/Regional_Parquet_Shards', 'north_america_q4.db', false, 185_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse/Regional_Parquet_Shards', 'apac_enterprise_q4.db', false, 140_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Customer_Data_Warehouse/Regional_Parquet_Shards', 'emea_enterprise_q4.db', false, 85_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Product_Prototype_Builds': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Product_Prototype_Builds', 'Windows_x64_Installer.msi', false, 225_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Product_Prototype_Builds', 'macOS_Universal_Bundle.dmg', false, 185_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Product_Prototype_Builds', 'BubbleDirStat_Standalone.exe', false, 82_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Product_Prototype_Builds', 'Debug_Symbols_Archive.7z', false, 48_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Q4_Financial_Models': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Q4_Financial_Models', 'Three_Year_DCF_Valuation.xlsx', false, 128_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Q4_Financial_Models', 'Unit_Economics_Sensitivity.xlsx', false, 94_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Q4_Financial_Models', 'Quarterly_Audit_Report.pdf', false, 62_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Q4_Financial_Models', 'Monte_Carlo_Revenue_Sim.py', false, 28_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Executive_Board_Decks': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Executive_Board_Decks', 'Q4_Board_Strategy_Deck.pptx', false, 96_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Executive_Board_Decks', 'Visual_Disk_Analyzer_Pitch.pptx', false, 64_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Executive_Board_Decks', 'Competitor_Benchmark_Brief.pdf', false, 38_000_000),
  ],
  'C:/Users/GroupPresentation/Business_Analytics_Suite/Legacy_Client_Backups': [
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Legacy_Client_Backups', '2024_Q4_Archive_Cold.tar.gz', false, 89_000_000),
    makeItem('C:/Users/GroupPresentation/Business_Analytics_Suite/Legacy_Client_Backups', '2025_Q1_Migration_Dump.zip', false, 56_000_000),
  ],
  'C:/Users/GroupPresentation/Downloads_Archive': [
    makeItem('C:/Users/GroupPresentation/Downloads_Archive', 'Ubuntu_Server_Live_Image.iso', false, 412_000_000),
    makeItem('C:/Users/GroupPresentation/Downloads_Archive', 'Python_3.12_Windows_amd64.exe', false, 118_000_000),
    makeItem('C:/Users/GroupPresentation/Downloads_Archive', 'Sample_Presentation_Template.pptx', false, 85_300_416),
  ],

  // Drive D: Production Media Vault
  'D:': [
    makeItem('D:', 'Production_Media_Vault', true, 6_420_000_000),
  ],
  'D:/Production_Media_Vault': [
    makeItem('D:/Production_Media_Vault', 'Cinema_4K_Renders', true, 3_250_000_000),
    makeItem('D:/Production_Media_Vault', 'Lossless_Audio_Stems', true, 1_180_000_000),
    makeItem('D:/Production_Media_Vault', 'Commercial_Final_Cut_ProRes.mov', false, 980_000_000),
    makeItem('D:/Production_Media_Vault', 'Texture_Photogrammetry_Pack.zip', false, 620_000_000),
    makeItem('D:/Production_Media_Vault', 'Color_Grading_LUT_Table.cube', false, 240_000_000),
    makeItem('D:/Production_Media_Vault', 'Production_Schedule_2026.xlsx', false, 150_000_000),
  ],
  'D:/Production_Media_Vault/Cinema_4K_Renders': [
    makeItem('D:/Production_Media_Vault/Cinema_4K_Renders', 'Scene_01_Aerial_Establish.mp4', false, 1_450_000_000),
    makeItem('D:/Production_Media_Vault/Cinema_4K_Renders', 'Scene_02_Product_Reveal.mp4', false, 1_120_000_000),
    makeItem('D:/Production_Media_Vault/Cinema_4K_Renders', 'Scene_03_Outro_Logo.mov', false, 680_000_000),
  ],
  'D:/Production_Media_Vault/Lossless_Audio_Stems': [
    makeItem('D:/Production_Media_Vault/Lossless_Audio_Stems', 'Orchestral_Score_24bit.wav', false, 640_000_000),
    makeItem('D:/Production_Media_Vault/Lossless_Audio_Stems', 'Foley_Sound_Design.flac', false, 540_000_000),
  ],

  // Drive E: Python Desktop Workspace
  'E:': [
    makeItem('E:', 'Python_Desktop_Workspace', true, 745_800_000),
  ],
  'E:/Python_Desktop_Workspace': [
    makeItem('E:/Python_Desktop_Workspace', 'dist_executables', true, 385_000_000),
    makeItem('E:/Python_Desktop_Workspace', 'benchmark_datasets', true, 210_000_000),
    makeItem('E:/Python_Desktop_Workspace', 'presentation_handouts', true, 84_000_000),
    makeItem('E:/Python_Desktop_Workspace', 'virtual_env_cache.zip', false, 48_500_000),
    makeItem('E:/Python_Desktop_Workspace', 'Filesystem_Index_Snapshot.db', false, 14_200_000),
    makeItem('E:/Python_Desktop_Workspace', 'Architecture_Whitepaper.pdf', false, 3_800_000),
    makeItem('E:/Python_Desktop_Workspace', 'bubbledirstat.py', false, 28_400),
    makeItem('E:/Python_Desktop_Workspace', 'README_PRESENTATION.md', false, 12_600),
  ],
  'E:/Python_Desktop_Workspace/dist_executables': [
    makeItem('E:/Python_Desktop_Workspace/dist_executables', 'BubbleDirStat_Win11_x64.exe', false, 195_000_000),
    makeItem('E:/Python_Desktop_Workspace/dist_executables', 'BubbleDirStat_macOS_ARM64.dmg', false, 190_000_000),
  ],
  'E:/Python_Desktop_Workspace/benchmark_datasets': [
    makeItem('E:/Python_Desktop_Workspace/benchmark_datasets', 'synthetic_100k_files_tree.json', false, 130_000_000),
    makeItem('E:/Python_Desktop_Workspace/benchmark_datasets', 'enterprise_storage_audit.csv', false, 80_000_000),
  ],
  'E:/Python_Desktop_Workspace/presentation_handouts': [
    makeItem('E:/Python_Desktop_Workspace/presentation_handouts', 'Business_Case_WinDirStat_vs_Bubbles.pptx', false, 54_000_000),
    makeItem('E:/Python_Desktop_Workspace/presentation_handouts', 'Circle_Packing_Math_Proof.pdf', false, 30_000_000),
  ],
};

/**
 * Builds a complete navigable directory map from browser-uploaded local files (`webkitRelativePath`)
 */
export function buildVirtualTreeFromFileList(files: FileList): {
  rootPath: string;
  tree: Record<string, RawDirItem[]>;
} {
  const tree: Record<string, RawDirItem[]> = {};
  const dirSizes: Record<string, number> = {};
  const dirChildren: Record<string, Map<string, { isDir: boolean; size: number }>> = {};

  let rootFolderName = 'Local_Selected_Folder';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = (file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const parts = relPath.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    if (i === 0 && parts.length > 1) {
      rootFolderName = parts[0];
    }

    const fileSize = file.size || 0;

    // Accumulate sizes along every ancestor folder
    for (let depth = 1; depth < parts.length; depth++) {
      const folderPath = `Local:/${parts.slice(0, depth).join('/')}`;
      dirSizes[folderPath] = (dirSizes[folderPath] || 0) + fileSize;

      if (!dirChildren[folderPath]) {
        dirChildren[folderPath] = new Map();
      }
      const childName = parts[depth];
      const isChildDir = depth < parts.length - 1;
      if (!isChildDir) {
        dirChildren[folderPath].set(childName, { isDir: false, size: fileSize });
      } else {
        const existing = dirChildren[folderPath].get(childName);
        if (!existing) {
          dirChildren[folderPath].set(childName, { isDir: true, size: 0 });
        }
      }
    }
  }

  // Convert dirChildren into RawDirItem[] arrays with computed recursive directory sizes
  for (const [folderPath, childrenMap] of Object.entries(dirChildren)) {
    const items: RawDirItem[] = [];
    for (const [childName, info] of childrenMap.entries()) {
      const childFullPath = `${folderPath}/${childName}`;
      const size = info.isDir ? dirSizes[childFullPath] || 0 : info.size;
      items.push({
        name: childName,
        path: childFullPath,
        is_dir: info.isDir,
        size,
        category: getFileCategory(childName, info.isDir),
      });
    }
    tree[folderPath] = items;
  }

  const rootPath = `Local:/${rootFolderName}`;
  if (!tree[rootPath]) {
    tree[rootPath] = [];
  }

  return { rootPath, tree };
}
