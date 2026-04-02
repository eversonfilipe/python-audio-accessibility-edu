# Trilha TEC - Acessibilidade Educacional em Programacao

## Contexto e Justificativa do Projeto

Este projeto e uma iniciativa desenvolvida e concebida organicamente no contexto do **Programa Florescendo Talentos** da CESAR SCHOOL, inserido nas necessidades praticas do projeto **Trilha TEC** (Estado de Pernambuco). O objetivo desta aplicacao e oferecer um ambiente de aprendizado e tutoria de programacao Python que seja intrinsecamente acessivel para estudantes do Ensino Medio da rede publica portadoras de deficiencia visual, englobando desde cegueira total ate condicoes de baixa visao.

O desenvolvimento deste repositorio originou-se de uma observacao empirica: estudantes com deficiencia visual encontravam barreiras intransponiveis ao tentar acompanhar os materiais didaticos tradicionais projetados via broadcasting em laboratorios de informatica. Havia uma clara dissonancia entre a exibicao visual da logica e a compreensao tempestiva exigida delas durante as instrucoes, agravada pela falta de letramento nativo em Braille. 

Para transpor essa exclusao, convertemos o desafio puramente pedagogico em resolutivo de engenharia de software criando um sistema interativo Offline, auditivo e amparado por Modelos de Linguagem de Inteligencia Artificial.

---

## Solucionando as Barreiras de Acessibilidade

O projeto baseou-se na eliminacao das tres principais lacunas identificadas pela tutoria local:

1. **Inacessibilidade em Tempo-Real (Broadcasting):** Toda interacao com os slides e linhas de condigo fonte foi reestruturada. O sistema pre-processa (via JSON) e narra as licoes e codigos de forma sincronizada com o avanco das telas do aluno, anulando a dependencia de tentar enxergar quadros apagados na frente da sala.
2. **Baixo Nivel de Contraste (Baixa Visao):** Refatoracao do Front-end aplicando principios de *Design Inclusivo* e os rigorosos padroes WCAG 2.1 (Nivel AAA). O sistema aplica a filosofia de "True Black" nas caixas de contorno, abandonando os fundos cinzas e potencializando as divisoes oticas minimas para retinas debilitadas no ambiente escolar.
3. **Impossibilidade Motora / Barreiras Logicas:** Ao inves de exigir o aprendizado forcado da digitacao em teclados cegos num estagio rudimentar de programacao, foi embutido um modelo de Processamento de Linguagem Natural (Web Speech API) onde a aluna "dita" seu raciocinio de codigo em portugues, e uma maquina neural constroi o algoritmo e explica a resposta falada.

---

## Funcionalidades e Engenharia MVP

### Arquitetura Web, Porem Offline
O coracao da solucao roda num Servidor Python (`Flask`) leve o suficiente para ser processado de maneira veloz sem uso de nuvem ou dependencia de cotas financeiras. As aulas sao roteadas para uma interface rica porem totalmente semantica.

### Integração de IA Autonoma (Ollama / TinyLlama)
Visando contornar e evadir restricoes criticas de seguranca presentes nas redes governamentais das escolas publicas que tipicamente bloqueiam Docker e/ou dependencias longas online, aplicamos uma infraestrutura conectada ao `Ollama`. 
O Modulo `ai_assistant.py` se comunica transparentemente com inferencias pesando em torno de ~1.5GB localmente. O aluno invoca a IA sem a necessidade de chaves limitadoras.

### Leitura Fluida, Semantica (ARIA)
Toda a comunicacao assincrona rege-se pelos atributos `role="status"` e `aria-live`. A navegacao por atalhos no teclado eh assistida para cegueira total.
A engine hibrida de Texto-Para-Voz (TTS) usa o pyttsx3/SAPI5 (nativos do Windows) para garantir responsividade total em modo offline, mas implementando hacks cruciais de *WebSpeech Context Unlocking* via overlays silenciosos padrao de interacao para anular o Autoplay block da Web.

---

## Estrategias de Instalação e Distribuição

Reconhecendo a limitacao fisica da TI das Escolas, estabelecemos vetores de distribuicao mutaveis.

### 1. Kit Educacional "Zero Instalacao" (Windows EXE e Pendrive)
Para uso real na ponta (Alunos): O mantenedor compila o Python utilizando a macro de exclusao limpa que deixamos pronta no diretorio de raiz: `python build.py`. 
Isso tritura todo o Front e Back-end numa aplicacao `TrilhaTEC_Acessibilidade.exe`. Este arquivo abre um bootloader Tkinter confiavel, e gerencia assincronamente o Flask ate o navegador ser acionado. 
*Para o cerebro de Logica (IA):* Execute/envie nas maquinas das Alunas o script `Instalar_IA_Ollama.bat` que baixara e incorporara em seguranca o TinyLlama nas salas.

### 2. Implantação Administrativa via Docker
Ainda mantem as configuracoes oficiais `Dockerfile` baseadas em `Debian Slim` caso haja disposicao ou servidores robustos na regiao escolar, podendo operar em regime LAN de roteamento padrao pelo `docker-compose up --build`.

### 3. Ambiente do Desenvolvedor Voluntário (Open Source)
Se quiser modificar ou escalar acessibilidade para a sua regiao:
1. `git clone https://github.com/eversonfilipe/python-audio-accessibility-edu`
2. `python -m venv venv` e ative o source virtual.
3. `pip install -r requirements.txt` (Instala componentes essenciais Flask e PyTTSx3).
4. `python src/app.py` abre a interface crua em http://127.0.0.1:5000/.

---

## Modulos e Licenca Open Source
**O projeto e perenemente de codigo-aberto.** Soluciona disparidades vitais na base da nossa rampa social e toda adaptacao em metodos heurísticos (ampliacao visual, drivers TTS injetados via PyInstaller, formatacao local MimeTypes) se enquadra em dominios publicos. Entusiastas da Educacao Inclusiva estao cordialmente convidados a refinar novos padroes WCAG nas abas de Aulas, assim como desenvolver ferramentas para transbordar a limitacao de recursos nas escolas do pais.
