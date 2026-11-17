# VIBOS

VIBOS includes two separate applications: a fictional-data web demo and a desktop app that scans real folders. The web demo cannot scan or delete real files.

## Web demo on Windows

1. Install Node.js LTS (Node 22.12 or later).
2. Extract the ZIP and open Command Prompt or PowerShell in the `VIBOS-main` folder containing `package.json`.
3. Run `npm install`, then `npm run dev`.
4. Open the local address shown (normally http://127.0.0.1:3000/). Press Ctrl+C to stop the server.

Click the map, then hold Ctrl and use the mouse wheel to zoom; drag the map or use arrow keys to pan. The zoom buttons remain available; the map scrollbars are hidden. Back and Forward move between visited sample folders. Use Menu to show or hide the sidebar. The web download serves `public/VIBOS_APP.py`; keep it identical to the root Python file when making changes. It is a single .py file, and Send2Trash must be installed separately for its Recycle Bin action.

## Desktop app on Windows

1. Install Python 3 from python.org; enable **Add Python to PATH**.
2. Open Command Prompt or PowerShell in the project folder.
3. Run `py -m pip install -r requirements.txt` once. If you only downloaded the .py file, run `py -m pip install Send2Trash` instead.
4. Run `py VIBOS_APP.py`.
5. Choose a real folder. Chosen folders appear in the dropdown for this session; removing a folder from the list does not delete it. Back and Forward follow navigation history. Select a row or bubble for its actions; hovering gives a preview only. Click the map, hold Ctrl and use the mouse wheel to zoom, and drag or use arrow keys to pan. The zoom buttons remain available; the map scrollbars are hidden. Hover over a bubble to enlarge it; click to select it. Search the largest-items list by name, and use Menu to show or hide the sidebar. Both apps default to the system theme and let you choose Ink and Mint (dark) or Paper and Tangerine (light).

The app sends selected real items to the Recycle Bin using Send2Trash and never falls back to permanent deletion if that fails. Recovery cannot be guaranteed; the bin can be emptied, and drive or Windows settings can affect whether an item is recyclable or removed permanently. Keep backups. If Send2Trash is not installed, moving items is disabled with an explanatory error.

Scanning may skip inaccessible or changing files; the status line warns and sizes can be incomplete. Symbolic links are not followed while calculating folder sizes. Cancel waits for the current filesystem operation to finish. Chosen folders are kept for the current session only.

## Windows executable (optional)

This source distribution does not include a tested executable. On a Windows machine, after installing the dependencies, install PyInstaller (`py -m pip install pyinstaller`) and build with `py -m PyInstaller --onefile --windowed --name VIBOS VIBOS_APP.py`. The result is `dist\VIBOS.exe`. Test scanning, the Recycle Bin action, and cancellation on Windows before distributing. The download terms are a draft and should be reviewed by legal counsel before release.

## Map controls and categories

Click a colored category to filter the list and map; click it again or choose All categories to reset. The Grouped option shows items beyond the largest 54 when the current Files/Folders view contains more than 55 items. The connecting lines are decorative and do not represent file relationships.

Click and drag the map to pan; keep dragging while holding Ctrl and scrolling to zoom. Drag input is captured until release even if the pointer goes outside the map, but the pointer itself is not physically confined. Hover is suppressed during zoom.
