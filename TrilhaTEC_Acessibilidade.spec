# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['launcher.py'],
    pathex=['src'],
    binaries=[],
    datas=[('src/templates', 'src/templates'), ('src/static', 'src/static'), ('src/lessons', 'src/lessons')],
    hiddenimports=['pyttsx3.drivers', 'pyttsx3.drivers.sapi5', 'edge_tts'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['numpy', 'pandas', 'scipy', 'matplotlib', 'PyQt5', 'PySide6', 'IPython', 'tensorflow', 'torch', 'keras', 'sklearn', 'scikit-learn', 'transformers', 'bokeh', 'seaborn', 'plotly', 'altair', 'statsmodels', 'numba', 'cython', 'dask', 'jupyter', 'notebook', 'sqlalchemy'],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TrilhaTEC_Acessibilidade',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TrilhaTEC_Acessibilidade',
)
