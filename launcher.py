import os
import sys
import threading
import time
import webbrowser
import urllib.request
import tkinter as tk

# Adiciona pastas locais ao PATH antes de carregar dependências do Flask
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

sys.path.insert(0, os.path.join(base_path, "src"))

from src.app import app

def start_flask():
    """Roda o servidor Flask em Background silenciando logs."""
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    # O user_reloader precisa ser False para funcionar limpo dentro de executáveis
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

def show_splash_and_launch():
    """Desenha a tela de carregamento Nativa do SO via Tkinter."""
    root = tk.Tk()
    root.overrideredirect(True)  # Remove as bordas do Windows (X, Maximizar)
    
    # Prepara o tamanho da telinha Splash
    window_width = 450
    window_height = 250
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = int((screen_width / 2) - (window_width / 2))
    y = int((screen_height / 2) - (window_height / 2))
    
    root.geometry(f'{window_width}x{window_height}+{x}+{y}')
    root.configure(bg='#121212') # Modo escuro nativo
    
    # Design simplório simulando High-Contrast
    frame = tk.Frame(root, bg='#121212', bd=4, relief="ridge")
    frame.pack(expand=True, fill='both', padx=10, pady=10)

    title = tk.Label(frame, text="Trilha TEC", font=('Segoe UI', 24, 'bold'), fg='#FFD700', bg='#121212')
    title.pack(pady=(30, 0))
    
    subtitle = tk.Label(frame, text="Acessibilidade Educacional", font=('Segoe UI', 14), fg='#FFFFFF', bg='#121212')
    subtitle.pack()

    status = tk.Label(frame, text="Iniciando Cérebro Local e Servidores...\nAguarde...", font=('Segoe UI', 10), fg='#A0A0A0', bg='#121212')
    status.pack(pady=(30, 0))

    # Inicia a thread do Flask WebApp
    threading.Thread(target=start_flask, daemon=True).start()

    def check_server():
        """Ping local até o Flask acordar na porta 5000"""
        try:
            # Tenta bater no endpoint nativo da aplicação que devolve as aulas
            urllib.request.urlopen('http://127.0.0.1:5000/api/lessons', timeout=1)
            
            # Se não deu Timeout, o app tá de pé!
            status.config(text="Pronto! Abrindo Sala de Aula...", fg='#00FF00')
            root.update()
            time.sleep(1) # Delay dramático
            
            # Derruba a splash
            root.destroy()
            
            # Abre navegador padrão do Sistema do Aluno
            webbrowser.open('http://127.0.0.1:5000/')
        except Exception:
            # Ouve de novo daqui a 500ms
            root.after(500, check_server)
            
    # Começa o ciclo de ping após 1.5s pra dar tempo da tela piscar suave    
    root.after(1500, check_server)
    root.mainloop()

if __name__ == '__main__':
    show_splash_and_launch()
    
    # Mantém o script em Background para manter a Thread do Flask viva
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)
