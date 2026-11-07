"""Blickrichtungen für die Assistenten-Figuren — Blender headless.

    /Applications/Blender.app/Contents/MacOS/Blender --background \
        --python scripts/avatar-blick.py -- assets/avatare [--nur 01] [--vorschau]

Die Figuren in assets/avatare sind 3D-Illustrationen, keine 3D-Modelle. Dieses
Skript macht aus jeder eine Büste: die freigestellte Silhouette wird
aufgewölbt (Abstand zum Rand → Tiefe), das Bild unverändert daraufgelegt und
aus 7 × 3 Blickrichtungen gerendert. Ergebnis: avatar-NN-blick.webp, ein
Raster, aus dem die Website je nach Zeiger das passende Bild zeigt — kein
WebGL, kein Dauerlauf im Browser.

Das Bild wird nicht neu beleuchtet (Emission), damit die Figur genau so
aussieht wie ihr Original. Die Winkel bleiben klein: eine Aufwölbung trägt
eine Kopfwendung um ±14°, keine Profilansicht.
"""
import bpy, math, sys
import numpy as np
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ORDNER = Path(argv[0] if argv else 'assets/avatare').resolve()
NUR = argv[argv.index('--nur') + 1] if '--nur' in argv else None
VORSCHAU = '--vorschau' in argv
YAW = [-14, -9, -4.5, 0, 4.5, 9, 14]      # Spalten: Blick nach links → rechts
PITCH = [-7, 0, 7]                        # Zeilen: Blick nach oben → unten
TIEFE = .42                               # maximale Aufwölbung, relativ zur Bildbreite


def tiefenkarte(alpha):
    """Abstand jedes Pixels zum Rand der Silhouette, als weiche Wölbung."""
    innen = alpha > .5
    d = np.zeros(alpha.shape, dtype=np.float32)
    feld = innen.copy()
    for schritt in range(1, 200):
        if not feld.any(): break
        d[feld] = schritt
        e = feld.copy()                                   # 4er-Erosion ohne scipy
        e[1:, :] &= feld[:-1, :]; e[:-1, :] &= feld[1:, :]
        e[:, 1:] &= feld[:, :-1]; e[:, :-1] &= feld[:, 1:]
        e[0, :] = e[-1, :] = False; e[:, 0] = e[:, -1] = False
        feld = e
    z = np.sqrt(d / max(d.max(), 1))                     # Kugelprofil statt Kegel
    for _ in range(6):                                    # Kanten der Erosion glätten
        z[1:-1, 1:-1] = (z[1:-1, 1:-1] * 4 + z[:-2, 1:-1] + z[2:, 1:-1] + z[1:-1, :-2] + z[1:-1, 2:]) / 8
    return z * innen


def figur(pfad):
    img = bpy.data.images.load(str(pfad))
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)   # Zeile 0 = unten
    z = tiefenkarte(px[:, :, 3]) * TIEFE * w

    # Gitter: ein Punkt je Pixel, Bild per UV unverändert darauf
    xs, ys = np.meshgrid(np.arange(w), np.arange(h))
    verts = np.stack([xs - w / 2 + .5, -z, ys + .5], axis=-1).reshape(-1, 3)
    idx = (ys * w + xs)[:-1, :-1].reshape(-1)
    faces = np.stack([idx, idx + 1, idx + w + 1, idx + w], axis=-1)
    mesh = bpy.data.meshes.new('Büste')
    mesh.from_pydata(verts.tolist(), [], faces.tolist())
    uv = mesh.uv_layers.new()
    loops = np.array([l.vertex_index for l in mesh.loops])
    uvs = np.stack([(loops % w + .5) / w, (loops // w + .5) / h], axis=-1)
    uv.data.foreach_set('uv', uvs.reshape(-1))
    for p in mesh.polygons: p.use_smooth = True
    obj = bpy.data.objects.new('Büste', mesh)
    bpy.context.scene.collection.objects.link(obj)

    m = bpy.data.materials.new('Bild'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'
    em = nt.nodes.new('ShaderNodeEmission'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    nt.links.new(tex.outputs['Alpha'], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED'
    obj.data.materials.append(m)

    # Drehpunkt: Kopfmitte (obere Bildhälfte), halbe Tiefe nach hinten
    zeilen = np.where(px[:, :, 3].max(axis=1) > .5)[0]
    oben = zeilen.max() if len(zeilen) else h
    piv = bpy.data.objects.new('Drehpunkt', None)
    bpy.context.scene.collection.objects.link(piv)
    piv.location = (0, z.max() * .45, oben - h * .28)
    bpy.context.view_layer.update()                       # sonst ist matrix_world noch die Einheit
    obj.parent = piv; obj.matrix_parent_inverse = piv.matrix_world.inverted()
    return img, w, h, piv, obj


def kamera(w, h):
    s = bpy.context.scene
    cam_data = bpy.data.cameras.new('Kamera'); cam_data.type = 'ORTHO'; cam_data.ortho_scale = max(w, h)
    cam = bpy.data.objects.new('Kamera', cam_data); s.collection.objects.link(cam)
    cam.location = (0, -2000, h / 2); cam.rotation_euler = (math.radians(90), 0, 0)
    cam_data.clip_end = 5000; s.camera = cam
    s.render.engine = 'BLENDER_EEVEE'
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.film_transparent = True
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
    s.view_settings.view_transform = 'Standard'        # Emission 1 = Originalfarbe
    try: s.eevee.taa_render_samples = 16
    except AttributeError: pass


def render(nr):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    img, w, h, piv, _ = figur(ORDNER / f'avatar-{nr}.webp')
    kamera(w, h)
    s = bpy.context.scene
    posen = [(0, 0), (14, 7), (-14, -7)] if VORSCHAU else [(y, p) for p in PITCH for y in YAW]
    blatt = np.zeros(((3 if not VORSCHAU else 1) * h, (len(YAW) if not VORSCHAU else 3) * w, 4), dtype=np.float32)
    tmp = Path(bpy.app.tempdir) / 'blick.png'
    spalten = 3 if VORSCHAU else len(YAW)
    for i, (yaw, pitch) in enumerate(posen):
        # Blick nach rechts (aus Sicht des Betrachters) heißt: Gesicht dreht sich nach rechts.
        piv.rotation_euler = (math.radians(-pitch), 0, math.radians(yaw))
        s.render.filepath = str(tmp); bpy.ops.render.render(write_still=True)
        r = bpy.data.images.load(str(tmp)); a = np.array(r.pixels[:], dtype=np.float32).reshape(h, w, 4)
        bpy.data.images.remove(r)
        reihe, spalte = divmod(i, spalten)
        y0 = blatt.shape[0] - (reihe + 1) * h               # Blender-Bilder beginnen unten
        blatt[y0:y0 + h, spalte * w:(spalte + 1) * w] = a
    out = bpy.data.images.new('blatt', blatt.shape[1], blatt.shape[0], alpha=True)
    out.pixels.foreach_set(blatt.reshape(-1))
    ziel = ORDNER / (f'avatar-{nr}-blick' + ('-vorschau.png' if VORSCHAU else '.webp'))
    s.render.image_settings.file_format = 'PNG' if VORSCHAU else 'WEBP'
    s.render.image_settings.quality = 80
    out.save_render(str(ziel), scene=s)
    print('ERZEUGT', ziel)


for nr in ([NUR] if NUR else [f'{i:02d}' for i in range(1, 11)]):
    render(nr)
