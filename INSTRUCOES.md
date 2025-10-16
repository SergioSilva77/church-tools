# Instruções de Uso - Church Util

## Primeiros Passos

### 1. Instalação

Abra o terminal nesta pasta e execute:

```bash
npm install
```

Aguarde a instalação de todas as dependências (pode levar alguns minutos).

### 2. Executar o App

```bash
npm run dev
```

O aplicativo será aberto automaticamente.

### 3. Criar Executável (Opcional)

Para criar um arquivo executável que pode ser distribuído:

```bash
npm run build
```

O executável estará na pasta `dist/`

## Uso do Aplicativo

### Gerenciar Dias

1. Clique em **"📅 Gerenciar Dias"**
2. Adicione dias da semana conforme necessário
3. Os dias padrão são: sábado, domingo, quarta

### Cadastrar Ação Geral

1. Clique em **"➕ Cadastrar Ação"**
2. Digite um título (ex: "Abertura - PowerPoint")
3. Selecione categoria **"Geral"**
4. (Opcional) Escolha um dia
5. Clique em **"Escolher"** para selecionar arquivo do computador
6. Clique em **"Salvar"**

### Cadastrar Ação Provai e Vede

1. Clique em **"➕ Cadastrar Ação"**
2. Digite título (ex: "Provai e Vede - 18/10/2025")
3. Selecione categoria **"Provai e Vede"**
4. Aguarde carregar lista de vídeos do trimestre atual
5. Clique em **"⬇️ Baixar e Selecionar"** no vídeo desejado
6. Aguarde download (progresso aparece na tela)
7. Clique em **"Salvar"**

**Dica**: Use o botão **"🔄 Recarregar Lista"** se novos vídeos foram adicionados recentemente.

### Cadastrar Ação Informativo

1. Clique em **"➕ Cadastrar Ação"**
2. Digite título (ex: "Informativo Semanal")
3. Selecione categoria **"Informativo"**
4. A data do próximo sábado aparece automaticamente
5. Clique em **"🔍 Verificar Disponibilidade"**
   - ✅ **Disponível**: Botão de download aparece
   - ⏳ **Aguardando**: Vídeo ainda não foi liberado
6. Se disponível, clique em **"⬇️ Baixar Informativo"**
7. Aguarde download e extração
8. Clique em **"Salvar"**

**Importante**: Todo sábado às 18:00, o app verifica automaticamente se há novo Informativo.

### Executar Ação

1. Na lista de ações, clique em **"▶️ Executar"**
2. O arquivo ou vídeo será aberto com o programa padrão

### Reordenar Ações

**Opção 1 - Botões:**
- Use os botões **↑** e **↓** em cada card

**Opção 2 - Drag & Drop:**
- Clique e arraste o card para a posição desejada

### Filtrar Ações

Use os filtros no topo da lista:
- **Por Dia**: Mostra apenas ações de um dia específico
- **Por Categoria**: Mostra apenas uma categoria

### Cronômetro

1. Digite o número da tela no campo **"Cronômetro (Tela:"**
   - Tela principal é geralmente **0**
   - Segunda tela é **1**, terceira é **2**, etc.
2. Clique em **"⏱️ Abrir"**
3. No cronômetro:
   - Configure minutos e segundos
   - Clique **▶ Iniciar**
   - Use **⏸ Pausar** para pausar
   - Use **↻ Reiniciar** para resetar
   - **Atalhos**: `Espaço` = Iniciar/Pausar, `R` = Reiniciar, `ESC` = Fechar

### Tela Preta

1. Digite o número da tela
2. Clique em **"⬛ Abrir"**
3. Tela preta aparece em fullscreen
4. Para fechar:
   - Pressione **ESC**
   - Dê **duplo clique**
   - Mova o mouse e clique no botão **✕ Fechar**

## Localização dos Arquivos

### Banco de Dados
- **Windows**: `C:\Users\<Usuario>\AppData\Roaming\church-util\db.json`

### Downloads
- **Provai e Vede**: `Downloads\ChurchUtil\ProvaiEVede\<trimestre>\`
- **Informativo**: `Downloads\ChurchUtil\Informativo\<trimestre>\`

## Problemas Comuns

### Vídeos não aparecem
- Verifique conexão com internet
- Clique em **"🔄 Recarregar Lista"**

### Download falha
- Verifique espaço em disco
- Firewall pode estar bloqueando
- Tente novamente mais tarde

### Informativo não disponível
- Vídeo é liberado geralmente 1 dia antes do sábado
- Aguarde ou tente no sábado de manhã
- Use **"🔍 Verificar Disponibilidade"** para atualizar status

### App não abre arquivo
- Verifique se arquivo existe no caminho
- Edite a ação e escolha arquivo novamente

## Dicas

1. **Organize por dia**: Crie ações separadas por sábado/domingo/quarta
2. **Nome claro**: Use títulos descritivos (ex: "Sábado - Abertura Louvor")
3. **Cache de vídeos**: Lista de Provai e Vede fica salva por 6h
4. **Multi-monitor**: Teste os números das telas antes do culto
5. **Backup**: Copie periodicamente o arquivo `db.json` (ver localização acima)

## Suporte

Em caso de problemas técnicos, consulte o arquivo `README.md` para informações detalhadas sobre a arquitetura do sistema.
