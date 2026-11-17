import importlib.util
import math
from pathlib import Path
import types
import unittest

spec = importlib.util.spec_from_file_location('vibos', Path(__file__).resolve().parents[1] / 'VIBOS_APP.py')
vibos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vibos)

class MapTests(unittest.TestCase):
    def test_filters_and_grouped_bucket(self):
        items = [{'name': str(i), 'path': str(i), 'size': i, 'is_dir': i % 2 == 0,
                  'category': 'Directory' if i % 2 == 0 else 'Document'} for i in range(70)]
        self.assertEqual(len(vibos.filter_items(items, 'Both', 'Document')), 35)
        self.assertEqual(vibos.filter_items(items, 'Directories', 'Document'), [])
        self.assertEqual(len(vibos.filter_items(items, 'Both', 'Grouped')), 16)
        self.assertEqual(vibos.filter_items(items[:55], 'Both', 'Grouped'), [])

    def test_hover_space_between_all_bubbles(self):
        app = vibos.VibosApp.__new__(vibos.VibosApp)
        items = [{'name': str(i), 'path': str(i), 'size': i + 1, 'is_dir': False,
                  'category': 'Document'} for i in range(55)]
        app._compute_bubble_layout(items, sum(x['size'] for x in items))
        for index, a in enumerate(app.bubbles):
            for b in app.bubbles[index + 1:]:
                self.assertGreaterEqual(math.hypot(a['x'] - b['x'], a['y'] - b['y']) + 1e-6,
                                        1.12 * (a['r'] + b['r']))

    def test_ctrl_drag_is_captured_and_release_frees_it(self):
        class Canvas:
            def __init__(self): self.captured = False
            def focus_set(self): pass
            def scan_mark(self, *args): pass
            def scan_dragto(self, *args, **kwargs): self.moved = True
            def grab_current(self): return self if self.captured else None
            def grab_set(self): self.captured = True
            def grab_release(self): self.captured = False
        app = vibos.VibosApp.__new__(vibos.VibosApp)
        app.canvas = Canvas(); app.zoom_gesture = True; app.suppress_release = False
        app.drag_origin = None; app.drag_moved = False; app.clear_hover = lambda: None
        app.on_canvas_click = lambda event: self.fail('Ctrl drag selected a bubble')
        app.on_map_press(types.SimpleNamespace(x=5, y=5, state=4))
        app.on_map_drag(types.SimpleNamespace(x=30, y=30, state=4))
        self.assertTrue(app.canvas.captured)
        app.on_map_release(types.SimpleNamespace(x=30, y=30, state=4))
        self.assertFalse(app.canvas.captured)
        self.assertIsNone(app.drag_origin)

if __name__ == '__main__': unittest.main()
