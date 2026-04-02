import os
import subprocess
import shutil

def build_executable():
    """
    Roteiro automatizado para gerar o executável nativo Windows
    do Projeto Trilha TEC de Acessibilidade, já colando os assets
    como HTML, CSS, JS e JSons das aulas internamente.
    """
    print("Limpando copilações antigas...")
    if os.path.exists("build"):
        shutil.rmtree("build")
    if os.path.exists("dist"):
        shutil.rmtree("dist")
    if os.path.exists("TrilhaTEC_Acessibilidade.spec"):
        os.remove("TrilhaTEC_Acessibilidade.spec")

    print("\nConstruindo App via PyInstaller...")
    
    # Montando a instrução do PyInstaller
    # Usando ; como separador nativo do Windows em `--add-data`
    command = [
        "python", "-m", "PyInstaller",
        "--name", "TrilhaTEC_Acessibilidade",
        # "--windowed", # Desativado TEMPORARIAMENTE para podermos ver o log (CMD) e achar o erro invisível
        "--noconfirm", # Sobrescreve dist antigo
        "--clean", # Apaga cache
        "--hidden-import", "pyttsx3.drivers", # Força a inclusão do motor de voz offline nativo do windows
        "--hidden-import", "pyttsx3.drivers.sapi5", # Força a inclusão do motor de voz SAPI5 Windows
        "--hidden-import", "edge_tts", # Módulo da Microsoft Neural
        "--paths", "src", # Mapeia explicitamente o diretório src/ para encontrar módulos (como config.py)
        "--exclude-module", "numpy", # Evita o Anaconda tentar empacotar 10GB de bibliotecas Cientificas em vão
        "--exclude-module", "pandas",
        "--exclude-module", "scipy",
        "--exclude-module", "matplotlib",
        "--exclude-module", "PyQt5",
        "--exclude-module", "PySide6",
        "--exclude-module", "IPython",
        # Machine Learning / Inteligência Artificial pesada off-line
        "--exclude-module", "tensorflow",
        "--exclude-module", "torch",
        "--exclude-module", "keras",
        "--exclude-module", "sklearn",
        "--exclude-module", "scikit-learn",
        "--exclude-module", "transformers",
        # Data Visualization / Dashboards
        "--exclude-module", "bokeh",
        "--exclude-module", "seaborn",
        "--exclude-module", "plotly",
        "--exclude-module", "altair",
        # Outros mamutes do Conda
        "--exclude-module", "statsmodels",
        "--exclude-module", "numba",
        "--exclude-module", "cython",
        "--exclude-module", "dask",
        "--exclude-module", "jupyter",
        "--exclude-module", "notebook",
        "--exclude-module", "sqlalchemy",
        "--add-data", "src/templates;src/templates",
        "--add-data", "src/static;src/static",
        "--add-data", "src/lessons;src/lessons",
        "launcher.py"
    ]
    
    try:
        # Aciona o comando no terminal em tempo-real
        subprocess.run(command, check=True)
        print("\n\nSUCESSO! O seu executável está pronto na pasta `dist/`.")
        print("Basta acessar a pasta `dist/TrilhaTEC_Acessibilidade` e clicar no arquivo com ícone de aplicativo!")
    except subprocess.CalledProcessError as e:
        print(f"\nFalha na compilação: {e}")
        print("Dica: Você instalou o PyInstaller? Rode: pip install pyinstaller")

if __name__ == "__main__":
    build_executable()
