# Church Util - Ferramenta de Sonoplastia

App Electron para sonoplastas gerenciarem ações, vídeos Provai e Vede, Informativos e outras mídias durante cultos e eventos.

## Funcionalidades

### Gerenciamento de Ações
- Cadastrar, editar e excluir ações
- Organizar ações por dias (sábado, domingo, quarta, etc.)
- Reordenar ações via drag & drop ou botões ↑/↓
- Filtrar ações por dia ou categoria
- Executar ações (abrir arquivos/vídeos)

### Categorias Suportadas

#### 1. Geral
- Associar qualquer arquivo local (vídeos, áudios, PowerPoint, etc.)
- Abrir arquivo com aplicativo padrão do sistema

#### 2. Provai e Vede
- Listar automaticamente vídeos do trimestre atual
- Baixar vídeos direto do site oficial adventista
- Cache de 6 horas para lista de vídeos
- Armazenamento em `Downloads/ChurchUtil/ProvaiEVede/<trimestre>/`

#### 3. Informativo
- Detectar próximo sábado automaticamente
- Verificar disponibilidade do Informativo
- Baixar e extrair vídeo do arquivo ZIP
- Verificação automática todos os sábados às 18:00
- Armazenamento em `Downloads/ChurchUtil/Informativo/<trimestre>/`

### Ferramentas Extras

#### Cronômetro
- Cronômetro fullscreen em qualquer monitor
- Configurar minutos e segundos
- Controles: Iniciar, Pausar, Reiniciar
- Atalhos de teclado:
  - `Espaço`: Iniciar/Pausar
  - `R`: Reiniciar
  - `ESC`: Fechar

#### Tela Preta
- Tela preta fullscreen em qualquer monitor
- Útil para ocultar projeção temporariamente
- Fechar com `ESC` ou duplo clique

## Instalação

### Requisitos
- Node.js 18+ instalado
- Windows, macOS ou Linux

### Passos

1. Clone ou baixe o repositório

2. Instale as dependências:
```bash
npm install
```

3. Execute em modo desenvolvimento:
```bash
npm run dev
```

4. Para criar executável:
```bash
npm run build
```
O executável estará na pasta `dist/`

## Estrutura do Projeto

```
church-util-02/
├── main/               # Processo principal do Electron
│   ├── index.js       # Entry point, IPC handlers, janelas
│   ├── database.js    # Persistência JSON
│   └── downloads.js   # Download, parsing HTML, extração ZIP
├── preload/           # Ponte segura (contextBridge)
│   └── preload.js
├── renderer/          # Interface (HTML/CSS/JS)
│   ├── index.html     # Dashboard principal
│   ├── app.js         # Lógica da interface
│   ├── styles.css     # Tema dark azul
│   ├── cronometro.html
│   └── telapreta.html
├── package.json
└── README.md
```

## Persistência de Dados

Os dados são salvos em JSON no diretório do usuário:
- **Windows**: `C:\Users\<Usuario>\AppData\Roaming\church-util\db.json`
- **macOS**: `~/Library/Application Support/church-util/db.json`
- **Linux**: `~/.config/church-util/db.json`

### Estrutura de Dados

```json
{
  "dias": [
    { "id": "uuid", "nome": "sábado" }
  ],
  "acoes": [
    {
      "id": "uuid",
      "titulo": "Abrir Provai e Vede",
      "diaId": "uuid",
      "ordem": 1,
      "categoria": "provai_vede",
      "arquivoPath": "",
      "categoriaMeta": {
        "provai_vede": {
          "trimestre": "4trimestre2025",
          "videoSelecionado": {
            "titulo": "PV 2025-10-18",
            "url": "https://...mp4",
            "localPath": "C:/.../pv-2025-10-18.mp4",
            "baixadoEm": "2025-10-16T12:00:00-03:00"
          }
        },
        "informativo": {
          "trimestre": "4trimestre2025",
          "dataReferencia": "2025-10-18",
          "zipUrl": "https://...",
          "status": "disponivel",
          "videoExtraidoPath": "C:/.../informativo_181025.mp4"
        }
      }
    }
  ]
}
```

## Agendamento Automático

O app verifica automaticamente todos os **sábados às 18:00** (timezone America/Sao_Paulo) se há novo Informativo disponível e atualiza o status das ações.

## IPC Handlers (API Interna)

### Dias
- `dias:list` - Listar todos os dias
- `dias:create` - Criar novo dia
- `dias:update` - Atualizar dia
- `dias:delete` - Excluir dia

### Ações
- `acoes:list` - Listar todas as ações
- `acoes:create` - Criar nova ação
- `acoes:update` - Atualizar ação
- `acoes:delete` - Excluir ação
- `acoes:reorder` - Reordenar ações

### Arquivos
- `files:choose` - Abrir diálogo para escolher arquivo
- `files:open` - Abrir arquivo com app padrão

### Provai e Vede
- `provai:listarVideos` - Listar vídeos do trimestre atual
- `provai:baixar` - Baixar vídeo

### Informativo
- `informativo:status` - Verificar disponibilidade
- `informativo:proximoSabado` - Obter data do próximo sábado
- `informativo:baixar` - Baixar e extrair Informativo

### Display (Multi-monitor)
- `display:list` - Listar monitores disponíveis
- `display:cronometro:abrir` - Abrir cronômetro em monitor específico
- `display:telapreta:abrir` - Abrir tela preta em monitor específico

## Tratamento de Erros

- **Sem internet**: Mensagens claras sobre falha de conexão
- **Vídeo não liberado**: Indica status "aguardando"
- **Parsing HTML falhou**: Avisa que formato do site mudou
- **Arquivo não encontrado**: Solicita nova seleção

## Segurança

- **Context Isolation**: Ativado (preload com contextBridge)
- **Node Integration**: Desativado no renderer
- **IPC Seguro**: Apenas handlers pré-definidos expostos
- **Sem acesso direto**: Renderer não acessa fs/net diretamente

## Dependências Principais

- **electron**: Framework desktop
- **node-cron**: Agendamento automático
- **cheerio**: Parsing HTML (lista de vídeos)
- **adm-zip**: Extração de arquivos ZIP
- **uuid**: Geração de IDs únicos

## Temas e UI

- **Tema**: Dark com acento azul (#3b82f6)
- **Cards**: Sombras e efeitos neo-morfismo
- **Tipografia**: Segoe UI
- **Responsivo**: Layout adaptável

## Atalhos de Teclado

### Cronômetro
- `Espaço`: Iniciar/Pausar
- `R`: Reiniciar
- `ESC`: Fechar

### Tela Preta
- `ESC`: Fechar
- `Duplo Clique`: Fechar

## Troubleshooting

### Erro "File is not defined" ao iniciar
Este erro foi **corrigido** com um polyfill no início do `main/index.js`. Se o erro persistir:
- Certifique-se de que executou `npm install` após baixar o projeto
- Verifique que o polyfill está presente no início de `main/index.js`
- Consulte `CORREÇÃO_FILE_ERROR.md` para detalhes técnicos
- Use `TESTE_CORREÇÃO.md` para validar a correção

### App não inicia
- Verifique se Node.js está instalado: `node --version`
- Reinstale dependências: `npm install`

### Vídeos não listam
- Verifique conexão com internet
- Site pode ter mudado formato (atualização necessária)

### Downloads falham
- Verifique espaço em disco
- Permissões na pasta Downloads
- Firewall/antivírus bloqueando

### Cronômetro não aparece no monitor correto
- Verifique número da tela (0, 1, 2...)
- Windows: Tela principal é geralmente 0

## Créditos

Desenvolvido para facilitar o trabalho de sonoplastas em igrejas adventistas.

**Fontes de Conteúdo:**
- Provai e Vede: https://downloads.adventistas.org
- Informativo: https://files.adventistas.org/daniellocutor

## Licença

MIT
