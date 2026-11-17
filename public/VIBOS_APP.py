import os
import math
import colorsys
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox


# --- COLOR PALETTE & FILE CATEGORIES ---
BG_DARK = "#181825"
PANEL_BG = "#1e1e2e"
TEXT_MAIN = "#cdd6f4"
TEXT_MUTED = "#a6adc8"
ACCENT = "#89b4fa"

CATEGORY_COLORS = {
    "Directory": {"fill": "#b8cbd2", "outline": "#607783", "text": "#142639"},
    "Media": {"fill": "#c2bad8", "outline": "#77708b", "text": "#142639"},
    "Document": {"fill": "#a8c8dc", "outline": "#64839b", "text": "#142639"},
    "Archive/App": {"fill": "#ccc9ac", "outline": "#827f67", "text": "#142639"},
    "Code/Data": {"fill": "#a9caba", "outline": "#668c7a", "text": "#142639"},
    "Other File": {"fill": "#bcc5d0", "outline": "#7a8796", "text": "#142639"},
    "Grouped": {"fill": "#7a8899", "outline": "#a3afbf", "text": "#101923"},
}

EXT_MAP = {
    "Media": {".mp4", ".mkv", ".avi", ".mov", ".mp3", ".wav", ".flac", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"},
    "Document": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".rtf"},
    "Archive/App": {".zip", ".rar", ".7z", ".tar", ".gz", ".exe", ".msi", ".dmg", ".iso", ".apk", ".dll"},
    "Code/Data": {".py", ".js", ".ts", ".html", ".css", ".cpp", ".c", ".java", ".json", ".xml", ".csv", ".sql", ".db"}
}


def get_file_category(filename, is_dir):
    if is_dir:
        return "Directory"
    ext = os.path.splitext(filename)[1].lower()
    for category, extensions in EXT_MAP.items():
        if ext in extensions:
            return category
    return "Other File"


def filter_items(raw_items, mode, category):
    items = [item for item in raw_items if mode == "Both" or (mode == "Files" and not item["is_dir"]) or (mode == "Directories" and item["is_dir"])]
    items.sort(key=lambda item: item["size"], reverse=True)
    if category == "Grouped":
        return items[54:] if len(items) > 55 else []
    if category != "All":
        return [item for item in items if item["category"] == category]
    return items


def format_size(size_bytes):
    if size_bytes <= 0:
        return "0 B"
    units = ("B", "KB", "MB", "GB", "TB")
    i = min(int(math.floor(math.log(size_bytes, 1024))), len(units) - 1)
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {units[i]}"


def system_theme():
    if os.name == "nt":
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize") as key:
                return "Light" if winreg.QueryValueEx(key, "AppsUseLightTheme")[0] else "Dark"
        except OSError:
            pass
    return "Light"


class VibosApp:
    def __init__(self, root):
        self.root = root
        self.root.title("VIBOS — Desktop")
        self.root.geometry("1200x760")
        self.root.minsize(720, 520)
        self.root.configure(bg=BG_DARK)

        # State variables
        self.current_path = tk.StringVar(value="")
        self.theme = tk.StringVar(value="System")
        self.applied_theme = system_theme()
        self.map_zoom = 1.0
        self.sidebar_open = True
        self.drag_origin = None
        self.drag_moved = False
        self.suppress_release = False
        self.zoom_gesture = False
        self.search_text = tk.StringVar(value="")
        self.scanning = False
        self.scan_warnings = 0
        self.chosen_folders = []
        self.folder_history = []
        self.history_index = -1
        self.category_filter = tk.StringVar(value="All")
        self.filter_mode = tk.StringVar(value="Both")  # "Both", "Files", "Directories"
        self.status_text = tk.StringVar(value="Ready. Select a folder to scan.")
        
        self.raw_items = []       # All scanned items in current directory
        self.bubbles = []         # Computed bubble coordinates and metadata
        self.hovered_index = None
        self.selected_index = None
        self.scan_thread = None
        self.stop_scan_event = threading.Event()

        self._setup_styles()
        self._build_ui()

        self.draw_bubbles()
        self.root.after(2000, self.check_system_theme)

    def _setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background=PANEL_BG)
        style.configure("Dark.TFrame", background=BG_DARK)
        style.configure("TLabel", background=PANEL_BG, foreground=TEXT_MAIN, font=("Segoe UI", 10))
        style.configure("Header.TLabel", background=PANEL_BG, foreground=TEXT_MAIN, font=("Segoe UI", 13, "bold"))
        style.configure("Brand.TLabel", background=PANEL_BG, foreground="#963c13" if self.applied_theme == "Light" else ACCENT, font=("Segoe UI", 13, "bold"))
        style.configure("Status.TLabel", background=PANEL_BG, foreground=TEXT_MUTED, font=("Segoe UI", 9))
        
        surface = "#f5e9dd" if self.applied_theme == "Light" else "#213c34"
        style.configure("TButton", background=surface, foreground=TEXT_MAIN, padding=(10, 8), borderwidth=0, relief="flat", bordercolor=surface, lightcolor=surface, darkcolor=surface, focusthickness=1, focuscolor=ACCENT)
        style.map("TButton", background=[("active", BG_DARK), ("disabled", PANEL_BG)], foreground=[("disabled", TEXT_MUTED)])
        style.configure("TCombobox", fieldbackground=BG_DARK, background=PANEL_BG, foreground=TEXT_MAIN, arrowcolor=TEXT_MAIN, borderwidth=1, relief="flat", bordercolor=surface, lightcolor=surface, darkcolor=surface, padding=5)
        style.map("TCombobox", fieldbackground=[("readonly", BG_DARK), ("disabled", PANEL_BG)], foreground=[("readonly", TEXT_MAIN), ("disabled", TEXT_MUTED)], selectbackground=[("readonly", BG_DARK)], selectforeground=[("readonly", TEXT_MAIN)])
        style.configure("TEntry", fieldbackground=BG_DARK, foreground=TEXT_MAIN, insertcolor=TEXT_MAIN)
        style.configure("Accent.TButton", background=ACCENT, foreground="#2a2420" if self.applied_theme == "Light" else "#0f1f1c", font=("Segoe UI", 10, "bold"), padding=(10, 9), borderwidth=0, relief="flat", bordercolor=ACCENT, lightcolor=ACCENT, darkcolor=ACCENT)
        style.map("Accent.TButton", background=[("active", ACCENT)])

        style.configure("Delete.TButton", background="#a9313d", foreground="#ffffff", font=("Segoe UI", 9, "bold"), padding=5)
        style.map("Delete.TButton",
                  background=[("active", "#81232e"), ("disabled", PANEL_BG)],
                  foreground=[("disabled", "#6c7086")])

        style.configure("TRadiobutton", background=PANEL_BG, foreground=TEXT_MAIN, font=("Segoe UI", 10))
        style.map("TRadiobutton", background=[("active", PANEL_BG)])

        style.configure("Treeview",
                        background=BG_DARK,
                        foreground=TEXT_MAIN,
                        fieldbackground=BG_DARK,
                        rowheight=32,
                        borderwidth=0, relief="flat",
                        font=("Segoe UI", 10))
        style.configure("Treeview.Heading",
                        background=PANEL_BG,
                        foreground=TEXT_MUTED, borderwidth=0, relief="flat",
                        font=("Segoe UI", 9, "bold"))
        style.configure("Vertical.TScrollbar", background=surface, troughcolor=BG_DARK, borderwidth=0, relief="flat", arrowcolor=TEXT_MUTED, arrowsize=10, lightcolor=surface, darkcolor=surface)
        style.configure("TPanedwindow", background=BG_DARK)
        style.configure("Sash", background=BG_DARK, sashthickness=10, gripcount=0)
        style.map("Treeview", background=[("selected", "#b9e6d0" if self.applied_theme == "Dark" else "#ffe1cc")], foreground=[("selected", "#18251f" if self.applied_theme == "Dark" else "#2a2420")])

    def _build_ui(self):
        top = ttk.Frame(self.root, padding=(10, 6))
        top.pack(fill=tk.X, padx=8, pady=(8, 2))
        self.btn_menu = ttk.Button(top, text="☰ Menu", command=self.toggle_sidebar); self.btn_menu.pack(side=tk.LEFT, padx=(0, 8))
        # Embed both variants so the standalone download needs no asset files.
        self.brand_images = {
            "Light": tk.PhotoImage(master=self.root, data="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"),
            "Dark": tk.PhotoImage(master=self.root, data="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"),
        }
        self.brand_label = ttk.Label(top, style="Status.TLabel")
        self.brand_label.pack(side=tk.LEFT, padx=(0, 8))
        ttk.Label(top, text="VIBOS", style="Brand.TLabel").pack(side=tk.LEFT)
        ttk.Label(top, text="  Desktop • Real files", style="Status.TLabel").pack(side=tk.LEFT)
        status = ttk.Frame(self.root, padding=(10, 5)); status.pack(side=tk.BOTTOM, fill=tk.X, padx=8, pady=(0, 6))
        ttk.Label(status, textvariable=self.status_text, style="Status.TLabel", wraplength=900).pack(anchor=tk.W)
        self.shell = ttk.Frame(self.root, style="Dark.TFrame"); self.shell.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)
        self.sidebar_holder = ttk.Frame(self.shell, width=225); self.sidebar_holder.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 8)); self.sidebar_holder.pack_propagate(False)
        self.sidebar_canvas = tk.Canvas(self.sidebar_holder, bg=PANEL_BG, highlightthickness=0, width=200)
        sidebar_scroll = ttk.Scrollbar(self.sidebar_holder, orient=tk.VERTICAL, command=self.sidebar_canvas.yview)
        self.sidebar_canvas.configure(yscrollcommand=sidebar_scroll.set)
        sidebar_scroll.pack(side=tk.RIGHT, fill=tk.Y); self.sidebar_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.sidebar = ttk.Frame(self.sidebar_canvas, padding=10)
        self.sidebar_window = self.sidebar_canvas.create_window((0, 0), window=self.sidebar, anchor="nw")
        self.sidebar.bind("<Configure>", lambda e: self.sidebar_canvas.configure(scrollregion=self.sidebar_canvas.bbox("all")))
        self.sidebar_canvas.bind("<Configure>", lambda e: self.sidebar_canvas.itemconfigure(self.sidebar_window, width=e.width))
        self.content = ttk.Frame(self.shell, style="Dark.TFrame"); self.content.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        ttk.Label(self.sidebar, text="FOLDERS & VIEW", style="Header.TLabel").pack(anchor=tk.W, pady=(0, 8))
        self.btn_browse = ttk.Button(self.sidebar, text="Add folder to scan", style="Accent.TButton", command=self.browse_directory); self.btn_browse.pack(fill=tk.X, pady=(0, 5))
        row = ttk.Frame(self.sidebar); row.pack(fill=tk.X, pady=2)
        self.btn_back = ttk.Button(row, text="Back", command=lambda: self.navigate_history(-1), state=tk.DISABLED); self.btn_back.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.btn_forward = ttk.Button(row, text="Forward", command=lambda: self.navigate_history(1), state=tk.DISABLED); self.btn_forward.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))
        row2 = ttk.Frame(self.sidebar); row2.pack(fill=tk.X, pady=2)
        self.btn_up = ttk.Button(row2, text="Up one level", command=self.go_up_directory, state=tk.DISABLED); self.btn_up.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.btn_refresh = ttk.Button(row2, text="Rescan", command=lambda: self.start_scan(self.current_path.get()), state=tk.DISABLED); self.btn_refresh.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))
        self.btn_cancel = ttk.Button(self.sidebar, text="Cancel scan", command=self.cancel_scan, state=tk.DISABLED)
        self.folder_label = ttk.Label(self.sidebar, text="Switch folder:"); self.folder_label.pack(anchor=tk.W, pady=(10, 3))
        self.folder_choice = ttk.Combobox(self.sidebar, state="disabled"); self.folder_choice.pack(fill=tk.X)
        self.folder_choice.bind("<<ComboboxSelected>>", self.switch_chosen_folder)
        self.btn_remove_folder = ttk.Button(self.sidebar, text="Remove from list", command=self.remove_chosen_folder, state=tk.DISABLED); self.btn_remove_folder.pack(fill=tk.X, pady=(3, 2))
        ttk.Label(self.sidebar, text="Current real folder:").pack(anchor=tk.W, pady=(6, 2))
        self.path_entry = tk.Entry(self.sidebar, textvariable=self.current_path, relief=tk.SOLID, font=("Segoe UI", 9), state="readonly"); self.path_entry.pack(fill=tk.X, ipady=4)
        ttk.Label(self.sidebar, text="Show:").pack(anchor=tk.W, pady=(7, 2))
        filters = ttk.Frame(self.sidebar); filters.pack(fill=tk.X)
        for label, mode in (("All", "Both"), ("Files", "Files"), ("Folders", "Directories")):
            ttk.Radiobutton(filters, text=label, value=mode, variable=self.filter_mode, command=self.update_visualization).pack(side=tk.LEFT, padx=(0, 3))
        ttk.Label(self.sidebar, text="Appearance:").pack(anchor=tk.W, pady=(8, 2))
        theme_box = ttk.Combobox(self.sidebar, textvariable=self.theme, values=("System", "Light", "Dark"), state="readonly"); theme_box.pack(fill=tk.X)
        theme_box.bind("<<ComboboxSelected>>", lambda e: self.apply_theme())
        main = ttk.Panedwindow(self.content, orient=tk.HORIZONTAL)
        main.pack(fill=tk.BOTH, expand=True)
        left = ttk.Frame(main, padding=16); right = ttk.Frame(main, style="Dark.TFrame", padding=0)
        main.add(left, weight=3); main.add(right, weight=2)
        ttk.Label(left, text="Bubble map", style="Header.TLabel").pack(anchor=tk.W)
        ttk.Label(left, text="Bigger bubbles use more space. Double-click a folder to open it.", style="Status.TLabel", wraplength=430).pack(anchor=tk.W, pady=(2, 5))
        ttk.Label(left, text="Filter by category", style="Status.TLabel").pack(anchor=tk.W, pady=(4, 0))
        legend = ttk.Frame(left); legend.pack(fill=tk.X, pady=(3, 3))
        self.category_buttons = {}
        legend_entries = [("All", None)] + list(CATEGORY_COLORS.items())
        for index, (category, colors) in enumerate(legend_entries):
            cell = ttk.Frame(legend); cell.grid(row=index // 4, column=index % 4, sticky="w", padx=(0, 6), pady=2)
            if colors:
                swatch = tk.Canvas(cell, width=12, height=12, bg=colors["fill"], highlightthickness=0)
                swatch.pack(side=tk.LEFT, padx=(0, 2))
                swatch.bind("<Button-1>", lambda e, cat=category: self.choose_category(cat))
            label = "All categories" if category == "All" else "Folder" if category == "Directory" else category
            button = tk.Button(cell, text=label, command=lambda cat=category: self.choose_category(cat),
                               font=("Segoe UI", 9), borderwidth=0, relief=tk.FLAT, padx=5, pady=3, takefocus=True)
            button.pack(side=tk.LEFT)
            self.category_buttons[category] = button
        ttk.Label(left, text="Grouped: items beyond the largest 54. Lines are decorative.", style="Status.TLabel", wraplength=500).pack(anchor=tk.W)
        zoomrow = ttk.Frame(left); zoomrow.pack(fill=tk.X, pady=(2, 3))
        ttk.Label(zoomrow, text="Map zoom:").pack(side=tk.LEFT, padx=(0, 4))
        ttk.Button(zoomrow, text="−", width=3, command=lambda: self.set_map_zoom(self.map_zoom / 1.3)).pack(side=tk.LEFT)
        self.zoom_label = ttk.Label(zoomrow, text="100%", width=6, anchor="center"); self.zoom_label.pack(side=tk.LEFT)
        ttk.Button(zoomrow, text="+", width=3, command=lambda: self.set_map_zoom(self.map_zoom * 1.3)).pack(side=tk.LEFT)
        ttk.Button(zoomrow, text="Reset", command=lambda: self.set_map_zoom(1)).pack(side=tk.LEFT, padx=4)
        ttk.Label(zoomrow, text="Click map • Ctrl + wheel to zoom • Drag to pan", style="Status.TLabel").pack(side=tk.LEFT, padx=4)
        map_frame = ttk.Frame(left); map_frame.pack(fill=tk.BOTH, expand=True)
        self.canvas = tk.Canvas(map_frame, bg=BG_DARK, highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Configure>", lambda e: self.draw_bubbles())
        self.canvas.bind("<Motion>", self.on_canvas_hover)
        self.canvas.bind("<ButtonPress-1>", self.on_map_press)
        self.canvas.bind("<B1-Motion>", self.on_map_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_map_release)
        self.canvas.bind("<Control-MouseWheel>", self.on_ctrl_wheel)
        self.canvas.bind("<Control-Button-4>", self.on_ctrl_wheel)
        self.canvas.bind("<Control-Button-5>", self.on_ctrl_wheel)
        for key in ("Control_L", "Control_R"):
            self.canvas.bind(f"<KeyPress-{key}>", self.on_control_press)
            self.canvas.bind(f"<KeyRelease-{key}>", self.on_control_release)
        self.canvas.bind("<FocusOut>", self.on_map_focus_out)
        self.canvas.bind("<Left>", lambda e: self.pan_key(-1, 0))
        self.canvas.bind("<Right>", lambda e: self.pan_key(1, 0))
        self.canvas.bind("<Up>", lambda e: self.pan_key(0, -1))
        self.canvas.bind("<Down>", lambda e: self.pan_key(0, 1))
        self.canvas.bind("<Double-Button-1>", self.on_canvas_double_click)
        details = ttk.Frame(right, padding=16); details.pack(fill=tk.X, pady=(0, 8))
        self.inspector_title = ttk.Label(details, text="Selected item", style="Header.TLabel"); self.inspector_title.pack(anchor=tk.W)
        self.lbl_insp_name = ttk.Label(details, text="Select a bubble or an item below", wraplength=290, font=("Segoe UI", 10, "bold")); self.lbl_insp_name.pack(anchor=tk.W, pady=(4, 2))
        self.lbl_insp_type = ttk.Label(details, text="Type: —"); self.lbl_insp_type.pack(anchor=tk.W)
        self.lbl_insp_size = ttk.Label(details, text="Size: —"); self.lbl_insp_size.pack(anchor=tk.W)
        self.lbl_insp_pct = ttk.Label(details, text="Share: —"); self.lbl_insp_pct.pack(anchor=tk.W)
        self.lbl_insp_path = ttk.Label(details, text="", wraplength=290); self.lbl_insp_path.pack(anchor=tk.W)
        self.action_frame = ttk.Frame(details); self.action_frame.pack(fill=tk.X, pady=4)
        self.btn_open_folder = ttk.Button(self.action_frame, text="Open selected folder", command=self.open_selected_folder)
        self.btn_show_location = ttk.Button(self.action_frame, text="Show in File Explorer", command=self.show_selected_location)
        self.btn_delete_file = ttk.Button(self.action_frame, text="Move selected file to Recycle Bin", style="Delete.TButton", command=self.delete_selected_file)
        self.btn_delete_dir = ttk.Button(self.action_frame, text="Move selected folder to Recycle Bin", style="Delete.TButton", command=self.delete_selected_directory)
        ranking = ttk.Frame(right, padding=16); ranking.pack(fill=tk.BOTH, expand=True)
        ttk.Label(ranking, text="Largest items", style="Header.TLabel").pack(anchor=tk.W)
        self.lbl_total_size = ttk.Label(ranking, text="Total: —"); self.lbl_total_size.pack(anchor=tk.W)
        self.lbl_item_count = ttk.Label(ranking, text="Items: —"); self.lbl_item_count.pack(anchor=tk.W, pady=(0, 5))
        search_row = ttk.Frame(ranking); search_row.pack(fill=tk.X, pady=(2, 4))
        ttk.Label(search_row, text="Search:").pack(side=tk.LEFT, padx=(0, 5))
        ttk.Entry(search_row, textvariable=self.search_text).pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.search_text.trace_add("write", lambda *_: self.populate_tree())
        tree_frame = ttk.Frame(ranking); tree_frame.pack(fill=tk.BOTH, expand=True)
        self.tree = ttk.Treeview(tree_frame, columns=("name", "type", "size", "pct"), show="headings", selectmode="browse")
        for col, title, width in (("name", "Name", 130), ("type", "Type", 55), ("size", "Size", 70), ("pct", "%", 45)):
            self.tree.heading(col, text=title); self.tree.column(col, width=width, minwidth=35, stretch=True)
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set); self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True); scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select); self.tree.bind("<Double-1>", self.on_tree_double_click)
        self.tree.bind("<Return>", self.on_tree_double_click)
        self.apply_theme()

    def apply_theme(self):
        global BG_DARK, PANEL_BG, TEXT_MAIN, TEXT_MUTED, ACCENT
        self.applied_theme = system_theme() if self.theme.get() == "System" else self.theme.get()
        if self.applied_theme == "Light":
            BG_DARK, PANEL_BG, TEXT_MAIN, TEXT_MUTED, ACCENT = "#faf6ee", "#ffffff", "#2a2420", "#66574e", "#ff7a3d"
        else:
            BG_DARK, PANEL_BG, TEXT_MAIN, TEXT_MUTED, ACCENT = "#0f1f1c", "#162b27", "#f3ebdd", "#c5cfc1", "#5cf2b0"
        self.root.configure(bg=BG_DARK)
        self._setup_styles()
        self.canvas.configure(bg=BG_DARK)
        self.sidebar_canvas.configure(bg=PANEL_BG)
        self.brand_label.configure(image=self.brand_images[self.applied_theme])
        self.update_category_buttons()
        self.path_entry.configure(readonlybackground=BG_DARK, fg=TEXT_MAIN)
        self.draw_bubbles()

    def choose_category(self, category):
        current = self.category_filter.get()
        self.category_filter.set("All" if current == category and category != "All" else category)
        self.update_category_buttons()
        if self.current_path.get() and not self.scanning:
            self.update_visualization()

    def update_category_buttons(self):
        for category, button in self.category_buttons.items():
            selected = category == self.category_filter.get()
            color = CATEGORY_COLORS[category]["fill"] if category != "All" else ACCENT
            label = "All categories" if category == "All" else "Folder" if category == "Directory" else category
            button.configure(text=("✓ " if selected else "") + label,
                             background=self.vivid_color(color) if selected else PANEL_BG,
                             foreground="#142639" if selected else TEXT_MAIN,
                             activebackground=self.vivid_color(color), activeforeground="#142639")

    def check_system_theme(self):
        if self.theme.get() == "System" and system_theme() != self.applied_theme:
            self.apply_theme()
        self.root.after(2000, self.check_system_theme)

    def toggle_sidebar(self):
        if self.sidebar_open:
            self.sidebar_holder.pack_forget()
        else:
            self.sidebar_holder.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 8), before=self.content)
        self.sidebar_open = not self.sidebar_open

    def set_map_zoom(self, value, anchor=None):
        old = self.map_zoom
        new = max(1.0, min(5.0, value))
        if new == old:
            return
        vw, vh = self.canvas.winfo_width(), self.canvas.winfo_height()
        px, py = anchor if anchor else (vw / 2, vh / 2)
        oldx, oldy = self.canvas.canvasx(px), self.canvas.canvasy(py)
        self.map_zoom = new
        self.zoom_label.config(text=f"{new:.0%}")
        self.draw_bubbles()
        self.canvas.xview_moveto(max(0, (oldx * new / old - px) / (vw * new)))
        self.canvas.yview_moveto(max(0, (oldy * new / old - py) / (vh * new)))

    def clear_hover(self):
        if self.hovered_index is not None:
            self.hovered_index = None
            if self.selected_index is not None:
                self._update_inspector(self.selected_index)
            else:
                self.inspector_title.config(text="Selected item")
                self.lbl_insp_name.config(text="Select a bubble or an item below")
                self.lbl_insp_path.config(text=""); self.lbl_insp_type.config(text="Type: —")
                self.lbl_insp_size.config(text="Size: —"); self.lbl_insp_pct.config(text="Share: —")
            self.draw_bubbles()

    def on_control_press(self, event):
        self.zoom_gesture = True
        self.clear_hover()

    def on_control_release(self, event):
        self.zoom_gesture = False

    def pan_key(self, dx, dy):
        if self.zoom_gesture:
            return "break"
        if dx:
            self.canvas.xview_scroll(dx * 2, "units")
        if dy:
            self.canvas.yview_scroll(dy * 2, "units")
        return "break"

    def on_ctrl_wheel(self, event):
        if self.root.focus_get() is not self.canvas:
            return
        self.zoom_gesture = True
        self.clear_hover()
        positive = getattr(event, "delta", 0) > 0 or getattr(event, "num", 0) == 4
        x = max(0, min(self.canvas.winfo_width(), event.x))
        y = max(0, min(self.canvas.winfo_height(), event.y))
        self.set_map_zoom(self.map_zoom * (1.2 if positive else 1 / 1.2), (x, y))
        if self.drag_origin is not None:
            self.canvas.scan_mark(event.x, event.y)
            self.drag_origin = (event.x, event.y)
        return "break"

    def on_map_press(self, event):
        self.canvas.focus_set()
        if self.zoom_gesture or (getattr(event, "state", 0) & 0x4):
            self.suppress_release = True
        self.drag_origin = (event.x, event.y)
        self.drag_moved = False
        self.canvas.scan_mark(event.x, event.y)

    def on_map_drag(self, event):
        if self.drag_origin and (abs(event.x-self.drag_origin[0]) + abs(event.y-self.drag_origin[1])) > 5:
            self.drag_moved = True
        if self.drag_moved:
            if self.canvas.grab_current() is not self.canvas:
                self.canvas.grab_set()
            self.clear_hover()
            self.canvas.scan_dragto(event.x, event.y, gain=1)

    def on_map_release(self, event):
        if not self.drag_moved and not self.suppress_release:
            self.on_canvas_click(event)
        self.end_map_capture()

    def end_map_capture(self):
        if self.canvas.grab_current() is self.canvas:
            self.canvas.grab_release()
        self.drag_origin = None
        self.drag_moved = False
        self.suppress_release = False

    def on_map_focus_out(self, event):
        self.zoom_gesture = False
        self.end_map_capture()

    def set_busy(self, busy):
        self.scanning = busy
        self.btn_browse.config(state=tk.DISABLED if busy else tk.NORMAL)
        nav = tk.NORMAL if self.current_path.get() and not busy else tk.DISABLED
        self.btn_up.config(state=nav); self.btn_refresh.config(state=nav)
        self.btn_back.config(state=tk.NORMAL if not busy and self.history_index > 0 else tk.DISABLED)
        self.btn_forward.config(state=tk.NORMAL if not busy and self.history_index < len(self.folder_history)-1 else tk.DISABLED)
        self.btn_cancel.config(state=tk.NORMAL if busy else tk.DISABLED)
        if busy:
            self.btn_cancel.pack(fill=tk.X, pady=2, before=self.folder_label)
        else:
            self.btn_cancel.pack_forget()
        self.folder_choice.config(state="readonly" if self.chosen_folders and not busy else "disabled")
        self.btn_remove_folder.config(state=tk.NORMAL if self.chosen_folders and not busy else tk.DISABLED)
        self._sync_delete_button()

    # --- DIRECTORY NAVIGATION & SCANNING ---
    def browse_directory(self):
        folder = filedialog.askdirectory(initialdir=self.current_path.get() or os.path.expanduser("~"), title="Choose a real folder to scan")
        if folder:
            folder = os.path.abspath(folder)
            if os.path.normcase(folder) not in [os.path.normcase(f) for f in self.chosen_folders]:
                self.chosen_folders.append(folder)
            self.folder_choice.config(values=self.chosen_folders)
            self.folder_choice.set(folder)
            self.start_scan(folder)

    def switch_chosen_folder(self, event=None):
        self.start_scan(self.folder_choice.get())

    def remove_chosen_folder(self):
        chosen = self.folder_choice.get()
        if chosen in self.chosen_folders:
            self.chosen_folders.remove(chosen)
        self.folder_choice.config(values=self.chosen_folders)
        self.folder_choice.set(self.chosen_folders[0] if self.chosen_folders else "")
        self.set_busy(False)
        self.status_text.set("Removed folder from the list only. Your files were not changed.")

    def navigate_history(self, direction):
        index = self.history_index + direction
        if 0 <= index < len(self.folder_history):
            self.start_scan(self.folder_history[index], history_index=index)

    def cancel_scan(self):
        if self.scanning:
            self.stop_scan_event.set()
            self.btn_cancel.config(state=tk.DISABLED)
            self.status_text.set("Cancelling scan…")

    def scan_cancelled(self):
        self.set_busy(False)
        self.status_text.set("Scan cancelled. No results shown; choose Rescan to try again.")
        self.draw_bubbles()

    def go_up_directory(self):
        current = self.current_path.get()
        parent = os.path.dirname(os.path.abspath(current))
        if parent and parent != current:
            self.start_scan(parent)

    def start_scan(self, target_path, history_index=None):
        if self.scanning or not target_path:
            return
        target_path = os.path.abspath(target_path)
        if not os.path.isdir(target_path):
            messagebox.showerror("Invalid Directory", f"The path does not exist or is not a directory:\n{target_path}")
            return

        if history_index is not None:
            self.history_index = history_index
        elif not self.folder_history or self.folder_history[self.history_index] != target_path:
            self.folder_history = self.folder_history[:self.history_index + 1] + [target_path]
            self.history_index = len(self.folder_history) - 1
        if target_path in self.chosen_folders:
            self.folder_choice.set(target_path)
        self.current_path.set(target_path)
        self.stop_scan_event.clear()
        self.scan_warnings = 0
        self.selected_index = None
        self.raw_items = []
        self.bubbles = []
        self.tree.delete(*self.tree.get_children())
        self.lbl_insp_name.config(text="Select a bubble or an item below")
        self.lbl_insp_type.config(text="Type: —"); self.lbl_insp_size.config(text="Size: —"); self.lbl_insp_pct.config(text="Share: —")
        self.lbl_total_size.config(text="Total: —"); self.lbl_item_count.config(text="Items: —")
        self.inspector_title.config(text="Selected item"); self.lbl_insp_path.config(text="")
        self.set_busy(True)
        self.status_text.set(f"Scanning real folder: {target_path}")
        self.draw_loading_screen()

        self.scan_thread = threading.Thread(target=self._scan_worker, args=(target_path,), daemon=True)
        self.scan_thread.start()

    def _get_recursive_dir_size(self, folder_path):
        total = 0
        try:
            with os.scandir(folder_path) as it:
                for entry in it:
                    if self.stop_scan_event.is_set():
                        return total
                    try:
                        if entry.is_symlink():
                            continue
                        if entry.is_file(follow_symlinks=False):
                            total += entry.stat(follow_symlinks=False).st_size
                        elif entry.is_dir(follow_symlinks=False):
                            total += self._get_recursive_dir_size(entry.path)
                    except (PermissionError, FileNotFoundError, OSError):
                        self.scan_warnings += 1
                        continue
        except (PermissionError, FileNotFoundError, OSError):
            self.scan_warnings += 1
        return total

    def _scan_worker(self, target_path):
        items = []
        try:
            with os.scandir(target_path) as entries:
                entry_list = list(entries)
                total_entries = len(entry_list)

                for idx, entry in enumerate(entry_list):
                    if self.stop_scan_event.is_set():
                        self.root.after(0, self.scan_cancelled)
                        return
                    try:
                        is_dir = entry.is_dir(follow_symlinks=False)
                        if is_dir:
                            self.root.after(0, self.status_text.set,
                                            f"Scanning ({idx + 1}/{total_entries}): Calculating folder '{entry.name}'...")
                            size = self._get_recursive_dir_size(entry.path)
                        else:
                            size = entry.stat(follow_symlinks=False).st_size

                        items.append({
                            "name": entry.name,
                            "path": entry.path,
                            "is_dir": is_dir,
                            "size": size,
                            "category": get_file_category(entry.name, is_dir)
                        })
                    except (PermissionError, FileNotFoundError, OSError):
                        self.scan_warnings += 1
                        continue
        except (PermissionError, FileNotFoundError, OSError) as e:
            self.root.after(0, self.scan_failed, str(e))
            return
        if self.stop_scan_event.is_set():
            self.root.after(0, self.scan_cancelled)
        else:
            self.root.after(0, self.scan_finished, items)

    def scan_failed(self, error):
        self.set_busy(False)
        self.status_text.set("Scan failed: " + error)
        self.draw_bubbles()
        messagebox.showerror("Scan failed", error)

    def scan_finished(self, items):
        if self.stop_scan_event.is_set():
            self.scan_cancelled()
            return
        self.raw_items = items
        self.set_busy(False)
        self.update_visualization()

    # --- FILTERING & CIRCLE PACKING ALGORITHM ---
    def update_visualization(self):
        if self.scanning:
            return
        mode = self.filter_mode.get()
        filtered = filter_items(self.raw_items, mode, self.category_filter.get())
        self.filtered_items = filtered
        total_size = sum(x["size"] for x in filtered)

        # Update Summary UI
        self.lbl_total_size.config(text=f"Filtered Total Size: {format_size(total_size)}")
        self.lbl_item_count.config(text=f"Items Displayed: {len(filtered)} ({mode})")
        self.status_text.set(f"Scan complete. Showing {len(filtered)} items." + (f" {self.scan_warnings} items or folders could not be read; sizes may be incomplete." if self.scan_warnings else ""))

        self.populate_tree()

        # Group excess tiny items beyond top 55 so bubble chart stays fast & readable
        MAX_BUBBLES = 55
        if len(filtered) > MAX_BUBBLES:
            top_items = [dict(x) for x in filtered[:MAX_BUBBLES - 1]]
            remainder = filtered[MAX_BUBBLES - 1:]
            rem_size = sum(x["size"] for x in remainder)
            top_items.append({
                "name": f"{len(remainder)} smaller items",
                "path": None,
                "is_dir": False,
                "size": rem_size,
                "category": "Grouped"
            })
        else:
            top_items = [dict(x) for x in filtered]

        self._compute_bubble_layout(top_items, total_size)
        self.hovered_index = None
        self.selected_index = None
        self._sync_delete_button()
        self.lbl_insp_name.config(text="Select a bubble or an item below")
        self.inspector_title.config(text="Selected item"); self.lbl_insp_path.config(text="")
        self.lbl_insp_type.config(text="Type: —"); self.lbl_insp_size.config(text="Size: —"); self.lbl_insp_pct.config(text="Share: —")
        self.draw_bubbles()

    def populate_tree(self):
        if not hasattr(self, "tree") or not hasattr(self, "filtered_items") or self.scanning:
            return
        query = self.search_text.get().strip().casefold()
        self.tree.delete(*self.tree.get_children())
        total = sum(item["size"] for item in self.filtered_items)
        for i, item in enumerate(self.filtered_items):
            if query and query not in item["name"].casefold():
                continue
            pct = item["size"] / total * 100 if total else 0
            self.tree.insert("", tk.END, iid=str(i), values=(item["name"], "Folder" if item["is_dir"] else "File", format_size(item["size"]), f"{pct:.1f}%"))

    def _compute_bubble_layout(self, items, total_size):
        """
        Packs bubbles using a Golden-Angle Spiral Packing algorithm.
        Radius is proportional to sqrt(size) so bubble AREA represents file/folder size.
        """
        if not items:
            self.bubbles = []
            return

        max_size = max(item["size"] for item in items)
        min_r = 16.0
        max_r = 115.0

        placed = []
        padding = 5.0

        for i, item in enumerate(items):
            if max_size > 0:
                # Area proportional to size -> radius proportional to sqrt(size)
                norm = math.sqrt(item["size"] / max_size)
                r = min_r + (max_r - min_r) * norm
            else:
                r = 28.0

            pct = (item["size"] / total_size * 100) if total_size > 0 else 0.0

            if i == 0:
                # Largest item goes right in the center
                placed.append({
                    **item, "r": r, "x": 0.0, "y": 0.0, "pct": pct, "rank": i
                })
            else:
                # Search outward in concentric rings starting from closest possible distance to center
                dist = (placed[0]["r"] + r) * 1.12 + padding
                golden_angle = i * 2.3999632  # distributes bubbles evenly around center
                found_spot = False

                while not found_spot:
                    # Number of test points along the circumference of current ring
                    steps = max(14, int((2 * math.pi * dist) / 10.0))
                    for step in range(steps):
                        angle = golden_angle + (2 * math.pi * step / steps)
                        cx = dist * math.cos(angle)
                        cy = dist * math.sin(angle)

                        # Check collision against already-placed bubbles
                        collision = False
                        for p in placed:
                            dx = cx - p["x"]
                            dy = cy - p["y"]
                            min_dist = (r + p["r"]) * 1.12 + padding
                            if (dx * dx + dy * dy) < (min_dist * min_dist):
                                collision = True
                                break

                        if not collision:
                            placed.append({
                                **item, "r": r, "x": cx, "y": cy, "pct": pct, "rank": i
                            })
                            found_spot = True
                            break

                    dist += 6.0

        self.bubbles = placed

    # --- CANVAS DRAWING & INTERACTIVITY ---
    def draw_loading_screen(self):
        self.canvas.delete("all")
        w = self.canvas.winfo_width() or 700
        h = self.canvas.winfo_height() or 500
        self.canvas.create_text(
            w / 2, h / 2,
            text="Scanning directory sizes...\nCalculating bubble proportions...",
            fill=ACCENT, font=("Segoe UI", 14, "bold"), justify=tk.CENTER
        )

    def draw_bubbles(self):
        self.canvas.delete("all")
        view_w = self.canvas.winfo_width()
        view_h = self.canvas.winfo_height()
        if view_w < 50 or view_h < 50:
            return
        w, h = view_w * self.map_zoom, view_h * self.map_zoom
        self.canvas.configure(scrollregion=(0, 0, w, h))

        if not self.bubbles:
            self.canvas.create_text(
                w / 2, h / 2,
                text="Choose a folder to scan." if not self.current_path.get() else "No items match this filter.",
                fill=TEXT_MUTED, font=("Segoe UI", 13)
            )
            return

        # Compute bounding box of packed bubbles in layout space
        min_x = min(b["x"] - b["r"] * 1.12 for b in self.bubbles)
        max_x = max(b["x"] + b["r"] * 1.12 for b in self.bubbles)
        min_y = min(b["y"] - b["r"] * 1.12 for b in self.bubbles)
        max_y = max(b["y"] + b["r"] * 1.12 for b in self.bubbles)

        pack_w = max(1.0, max_x - min_x)
        pack_h = max(1.0, max_y - min_y)

        margin = 35.0
        scale = min((w - 2 * margin) / pack_w, (h - 2 * margin) / pack_h)
        center_x = (min_x + max_x) / 2.0
        center_y = (min_y + max_y) / 2.0

        visible = [b for b in self.bubbles if b["r"] > 0]
        for b in visible:
            b["sx"] = w / 2.0 + (b["x"] - center_x) * scale
            b["sy"] = h / 2.0 + (b["y"] - center_y) * scale
            b["sr"] = b["r"] * scale
        link_color = "#49645a" if self.applied_theme == "Dark" else "#b8a99c"
        for index, b in enumerate(visible[1:], start=1):
            nearest = min(visible[:index], key=lambda other: (other["x"] - b["x"]) ** 2 + (other["y"] - b["y"]) ** 2)
            self.canvas.create_line(nearest["sx"], nearest["sy"], b["sx"], b["sy"], fill=link_color, width=1)
        order = [i for i in range(len(self.bubbles)) if i != self.hovered_index]
        if self.hovered_index is not None and self.hovered_index < len(self.bubbles):
            order.append(self.hovered_index)
        for idx in order:
            b = self.bubbles[idx]
            if b["r"] == 0:
                continue
            sx, sy, sr = b["sx"], b["sy"], b["sr"]

            colors = CATEGORY_COLORS.get(b["category"], CATEGORY_COLORS["Other File"])
            is_hovered = (idx == self.hovered_index)
            is_selected = (idx == self.selected_index)

            outline_color = ACCENT if is_selected else colors["outline"]
            outline_width = 3 if is_selected else 1.5
            display_r = sr * 1.12 if is_hovered else sr
            fill = self.vivid_color(colors["fill"]) if is_hovered else colors["fill"]

            # Draw Bubble Circle
            self.canvas.create_oval(
                sx - display_r, sy - display_r, sx + display_r, sy + display_r,
                fill=fill,
                outline=outline_color,
                width=outline_width
            )

            # Draw Label inside Bubble if large enough
            if display_r >= 24:
                max_chars = max(4, int(display_r / 4.2))
                display_name = b["name"]
                if len(display_name) > max_chars:
                    display_name = display_name[:max_chars - 2] + ".."

                font_size = min(12, max(8, int(display_r / 5)))
                if display_r >= 38:
                    label_text = f"{display_name}\n{format_size(b['size'])}"
                else:
                    label_text = display_name

                self.canvas.create_text(
                    sx, sy,
                    text=label_text,
                    fill=colors["text"],
                    font=("Segoe UI", font_size, "bold"),
                    justify=tk.CENTER
                )

    @staticmethod
    def vivid_color(color):
        rgb = tuple(int(color[i:i+2], 16) / 255 for i in (1, 3, 5))
        h, saturation, value = colorsys.rgb_to_hsv(*rgb)
        vivid = colorsys.hsv_to_rgb(h, min(0.78, saturation * 1.65 + 0.03), min(1, value * 1.04))
        return "#" + "".join(f"{round(c * 255):02x}" for c in vivid)

    def _get_bubble_at_pos(self, x, y):
        for idx, b in enumerate(self.bubbles):
            dx = x - b.get("sx", 0)
            dy = y - b.get("sy", 0)
            sr = b.get("sr", 0) * (1.12 if idx == self.hovered_index else 1)
            if (dx * dx + dy * dy) <= (sr * sr):
                return idx
        return None

    def _update_inspector(self, idx):
        if idx is None or idx >= len(self.bubbles):
            return
        b = self.bubbles[idx]
        icon = "📁 " if b["is_dir"] else "📄 "
        self.inspector_title.config(text="Selected item" if idx == self.selected_index else "Hover preview — click to select")
        self.lbl_insp_name.config(text=f"{icon}{b['name']}")
        self.lbl_insp_path.config(text=f"Path: {b['path']}" if b.get("path") else "See the largest-items list for individual items.")
        self.lbl_insp_type.config(text=f"Category: {b['category']}")
        self.lbl_insp_size.config(text=f"Size: {format_size(b['size'])} ({b['size']:,} bytes)")
        self.lbl_insp_pct.config(text=f"Share of View: {b['pct']:.2f}%")

    def _sync_delete_button(self):
        for button in (self.btn_delete_file, self.btn_delete_dir, self.btn_open_folder, self.btn_show_location):
            button.pack_forget()
        if self.scanning or self.selected_index is None or self.selected_index >= len(self.bubbles):
            return
        b = self.bubbles[self.selected_index]
        if not b.get("path") or b["category"] == "Grouped":
            return
        if b["is_dir"]:
            self.btn_open_folder.pack(fill=tk.X, pady=(4, 0))
        if os.name == "nt":
            self.btn_show_location.pack(fill=tk.X, pady=(4, 0))
        button = self.btn_delete_dir if b["is_dir"] else self.btn_delete_file
        button.pack(fill=tk.X, pady=(4, 0))

    def open_selected_folder(self):
        if not self.scanning and self.selected_index is not None:
            b = self.bubbles[self.selected_index]
            if b["is_dir"] and b.get("path"):
                self.start_scan(b["path"])

    def show_selected_location(self):
        if os.name == "nt" and not self.scanning and self.selected_index is not None:
            b = self.bubbles[self.selected_index]
            if b.get("path"):
                try:
                    subprocess.Popen(["explorer", "/select,", os.path.normpath(b["path"])])
                except OSError as e:
                    messagebox.showerror("Could not open File Explorer", str(e))

    def delete_selected_file(self):
        self.move_selected_to_trash(False)

    def delete_selected_directory(self):
        self.move_selected_to_trash(True)

    def move_selected_to_trash(self, is_dir):
        if self.scanning or self.selected_index is None or self.selected_index >= len(self.bubbles):
            return
        b = self.bubbles[self.selected_index]
        if b["is_dir"] != is_dir or not b.get("path") or b["category"] == "Grouped":
            return
        try:
            from send2trash import send2trash
        except ImportError:
            messagebox.showerror("Recycle Bin support needed", "Install Send2Trash first:\npy -m pip install Send2Trash\n\nNothing was deleted.")
            return
        kind = "Folder and contents" if is_dir else "File"
        confirm = messagebox.askyesno("Move real item to Recycle Bin?",
            f"{kind}: {b['name']}\nSize: {format_size(b['size'])}\nFull path: {b['path']}\n\n"
            "VIBOS requests the Recycle Bin for this real item. Recovery is not guaranteed: Windows, the drive, or its settings may prevent recovery or remove the item permanently. Back up important files. Continue?",
            default=messagebox.NO)
        if not confirm:
            return
        try:
            send2trash(b["path"])
        except Exception as e:
            messagebox.showerror("Could not move item to Recycle Bin", f"VIBOS did not fall back to permanent deletion. Check the folder and Recycle Bin; the operation may have partially completed.\n\n{e}")
            self.start_scan(self.current_path.get())
            return
        self.start_scan(self.current_path.get())
        self.status_text.set(f"Moved {b['name']} to the Recycle Bin. Refreshing results…")

    def on_canvas_hover(self, event):
        if self.zoom_gesture or (getattr(event, "state", 0) & 0x4) or self.drag_moved:
            self.clear_hover()
            return
        idx = self._get_bubble_at_pos(self.canvas.canvasx(event.x), self.canvas.canvasy(event.y))
        if idx != self.hovered_index:
            self.hovered_index = idx
            self.canvas.config(cursor="hand2" if idx is not None else "")
            if self.selected_index is not None:
                self._update_inspector(self.selected_index)
            elif idx is not None:
                self._update_inspector(idx)
            else:
                self.inspector_title.config(text="Selected item")
                self.lbl_insp_name.config(text="Select a bubble or an item below")
                self.lbl_insp_path.config(text="")
                self.lbl_insp_type.config(text="Type: —"); self.lbl_insp_size.config(text="Size: —"); self.lbl_insp_pct.config(text="Share: —")
            self.draw_bubbles()

    def on_canvas_click(self, event):
        idx = self._get_bubble_at_pos(self.canvas.canvasx(event.x), self.canvas.canvasy(event.y))
        self.selected_index = idx
        self._sync_delete_button()
        if idx is not None:
            self._update_inspector(idx)
            rank_id = str(self.bubbles[idx]["rank"])
            if self.bubbles[idx]["category"] != "Grouped" and self.tree.exists(rank_id):
                self.tree.selection_set(rank_id)
                self.tree.see(rank_id)
        else:
            self.tree.selection_remove(self.tree.selection())
            self.inspector_title.config(text="Selected item")
            self.lbl_insp_name.config(text="Select a bubble or an item below")
            self.lbl_insp_path.config(text=""); self.lbl_insp_type.config(text="Type: —")
            self.lbl_insp_size.config(text="Size: —"); self.lbl_insp_pct.config(text="Share: —")
        self.draw_bubbles()

    def on_canvas_double_click(self, event):
        if self.zoom_gesture or (getattr(event, "state", 0) & 0x4):
            return "break"
        self.suppress_release = True
        idx = self._get_bubble_at_pos(self.canvas.canvasx(event.x), self.canvas.canvasy(event.y))
        if idx is not None:
            b = self.bubbles[idx]
            if b["is_dir"] and b["path"]:
                self.start_scan(b["path"])

    def on_tree_select(self, event):
        sel = self.tree.selection()
        if not sel:
            return
        rank = int(sel[0])
        # Highlight corresponding bubble if it's in the top bubbles
        if rank < len(self.filtered_items):
            if rank >= min(len(self.bubbles), 54) and len(self.filtered_items) > 55:
                item = self.filtered_items[rank]
                total = sum(x["size"] for x in self.filtered_items)
                self.bubbles = self.bubbles[:55]
                self.bubbles.append({**item, "pct": item["size"] / total * 100 if total else 0, "rank": rank, "x": 0, "y": 0, "r": 0})
                self.selected_index = len(self.bubbles) - 1
            else:
                self.selected_index = rank
            self._sync_delete_button()
            self._update_inspector(self.selected_index)
            self.draw_bubbles()

    def on_tree_double_click(self, event):
        sel = self.tree.selection()
        if not sel:
            return
        rank = int(sel[0])
        if rank < len(self.filtered_items):
            b = self.filtered_items[rank]
            if b["is_dir"] and b["path"]:
                self.start_scan(b["path"])


if __name__ == "__main__":
    root = tk.Tk()
    app = VibosApp(root)
    root.mainloop()
