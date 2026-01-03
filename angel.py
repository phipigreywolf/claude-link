#!/usr/bin/env python3
"""🐺 Clean breathing wolf"""

import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GLib, Gdk
from pathlib import Path
import signal, os

class Wolf(Gtk.Window):
    def __init__(self):
        super().__init__(title="🐺")
        self.set_default_size(280, 280)
        self.set_decorated(False)
        self.set_position(Gtk.WindowPosition.CENTER)
        self.set_keep_above(True)
        self.set_app_paintable(True)
        
        screen = self.get_screen()
        visual = screen.get_rgba_visual()
        if visual:
            self.set_visual(visual)
        
        signal.signal(signal.SIGTERM, lambda s,f: None)
        signal.signal(signal.SIGHUP, lambda s,f: None)
        
        css = b"""
        window { background: rgba(13, 17, 23, 0.95); border-radius: 140px; }
        .wolf { font-size: 100px; }
        .breath { font-size: 28px; }
        .status { font-size: 13px; color: #8b949e; }
        """
        style = Gtk.CssProvider()
        style.load_from_data(css)
        Gtk.StyleContext.add_provider_for_screen(screen, style, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        box.set_halign(Gtk.Align.CENTER)
        box.set_valign(Gtk.Align.CENTER)
        self.add(box)
        
        self.wolf = Gtk.Label(label="🐺")
        self.wolf.get_style_context().add_class("wolf")
        box.pack_start(self.wolf, False, False, 0)
        
        self.breath = Gtk.Label(label="")
        self.breath.get_style_context().add_class("breath")
        box.pack_start(self.breath, False, False, 5)
        
        self.status = Gtk.Label(label="")
        self.status.get_style_context().add_class("status")
        self.status.set_max_width_chars(30)
        self.status.set_ellipsize(3)  # END
        box.pack_start(self.status, False, False, 0)
        
        self.log_path = Path.home() / ".elwood" / "elwood.log"
        self.last_size = self.log_path.stat().st_size if self.log_path.exists() else 0
        self.state = 0
        self.breathing = False
        
        GLib.timeout_add(100, self.animate)
        GLib.timeout_add(200, self.check_log)
        
        self.show_all()
        GLib.timeout_add(1500, self.initial_hide)
    
    def initial_hide(self):
        if not self.breathing:
            self.hide()
        return False
    
    def animate(self):
        if self.breathing:
            self.state = (self.state + 1) % 12
            waves = ["∿", "∿∿", "∿∿∿", "∿∿∿∿", "∿∿∿∿∿", "∿∿∿∿∿∿", "∿∿∿∿∿", "∿∿∿∿", "∿∿∿", "∿∿", "∿", ""]
            self.breath.set_markup(f'<span color="{self.color}">{waves[self.state]}</span>')
        return True
    
    def check_log(self):
        try:
            if self.log_path.exists():
                size = self.log_path.stat().st_size
                if size > self.last_size:
                    with open(self.log_path) as f:
                        f.seek(self.last_size)
                        text = f.read()
                        
                        if 'EXEC:' in text:
                            cmd = text.split('EXEC:')[-1].split('\n')[0].strip()[:25]
                            self.show_wolf(cmd, "#79c0ff")
                        
                        if 'EXIT: 0' in text:
                            self.finish("#7ee787", "✓")
                        elif 'EXIT:' in text:
                            self.finish("#f85149", "✗")
                    
                    self.last_size = size
        except:
            pass
        return True
    
    def show_wolf(self, cmd, color):
        self.breathing = True
        self.color = color
        self.status.set_text(f"↓ {cmd}")
        self.breath.set_markup(f'<span color="{color}">∿∿∿</span>')
        self.show_all()
        self.present()
    
    def finish(self, color, symbol):
        self.color = color
        self.status.set_text(f"↑ {symbol}")
        GLib.timeout_add(2500, self.fade_out)
    
    def fade_out(self):
        self.breathing = False
        self.hide()
        return False

def on_delete(w, e):
    w.hide()
    return True

win = Wolf()
win.connect("delete-event", on_delete)
win.connect("destroy", lambda w: os._exit(0))
Gtk.main()
