# Guia de Teste - Correção do Erro "File is not defined"

## Objetivo

Verificar se o erro `ReferenceError: File is not defined` foi completamente resolvido.

## Pré-requisitos

Certifique-se de que as dependências estão instaladas:

```bash
npm install
```

## Testes a Realizar

### 1. Teste de Inicialização ✅

**Objetivo**: Verificar se o app inicia sem erros

**Passos**:
1. Abra o terminal na pasta do projeto
2. Execute:
   ```bash
   npm run dev
   ```
3. **Resultado esperado**:
   - App abre sem erros
   - Janela principal aparece
   - Console do terminal não mostra `ReferenceError: File is not defined`

**Se falhar**: O polyfill não foi carregado corretamente. Verifique que o código no início de `main/index.js` está presente.

---

### 2. Teste de Listagem de Vídeos (Provai e Vede) ✅

**Objetivo**: Verificar se o cheerio (que usa undici) funciona

**Passos**:
1. No app, clique em **"➕ Cadastrar Ação"**
2. Selecione categoria **"Provai e Vede"**
3. Aguarde carregar a lista de vídeos
4. **Resultado esperado**:
   - Lista de vídeos aparece
   - Nenhum erro no console
   - Vídeos do trimestre atual são exibidos

**Se falhar**:
- Verifique conexão com internet
- Verifique console do DevTools (Ctrl+Shift+I) para erros

---

### 3. Teste de Download (Provai e Vede) ✅

**Objetivo**: Verificar se downloads funcionam

**Passos**:
1. Na lista de vídeos Provai e Vede
2. Clique em **"⬇️ Baixar e Selecionar"** em qualquer vídeo
3. Aguarde download
4. **Resultado esperado**:
   - Barra de progresso aparece
   - Download completa
   - Caminho do arquivo aparece
   - Toast de sucesso

**Se falhar**: Verifique permissões da pasta Downloads

---

### 4. Teste de Verificação (Informativo) ✅

**Objetivo**: Verificar requests HTTP funcionam

**Passos**:
1. Cadastre ação categoria **"Informativo"**
2. Clique em **"🔍 Verificar Disponibilidade"**
3. **Resultado esperado**:
   - Status "✅ Disponível" ou "⏳ Aguardando" aparece
   - Nenhum erro no console

**Se falhar**: Verifique conexão com internet

---

### 5. Teste de Console (DevTools) ✅

**Objetivo**: Verificar ausência de warnings relacionados a File

**Passos**:
1. No app, pressione **Ctrl+Shift+I** (ou F12)
2. Vá para aba **Console**
3. Recarregue a página (Ctrl+R)
4. **Resultado esperado**:
   - Nenhum erro vermelho relacionado a `File`
   - Nenhum erro de `undici`
   - Pode ter warning amarelo do polyfill (ok)

---

### 6. Teste de Funcionalidades Gerais ✅

**Objetivo**: Garantir que o polyfill não quebrou nada

**Passos**:
1. Cadastre ação categoria **"Geral"**
2. Escolha um arquivo qualquer
3. Execute a ação (botão ▶️)
4. **Resultado esperado**:
   - Arquivo abre normalmente
   - Nenhum erro

---

## Checklist Completo

- [ ] App inicia sem erro `File is not defined`
- [ ] Lista de vídeos Provai e Vede carrega
- [ ] Download de vídeos funciona
- [ ] Verificação de Informativo funciona
- [ ] Console limpo (sem erros de File/undici)
- [ ] Funcionalidades gerais preservadas
- [ ] Cronômetro e Tela Preta funcionam

## Em Caso de Erro

### Erro Persiste

Se o erro `File is not defined` ainda aparece:

1. Verifique que o polyfill está no **início** de `main/index.js` (antes de qualquer require)
2. Reinicie o terminal completamente
3. Limpe cache do Node: `npm cache clean --force`
4. Reinstale: `rm -rf node_modules && npm install`

### Novo Erro Aparece

Se um NOVO erro aparecer após a correção:

1. Anote o erro completo
2. Verifique se é relacionado a `Blob` ou `Buffer`
3. Pode ser necessário adicionar polyfill de `FormData` ou `Headers`

### Consulte

- `CORREÇÃO_FILE_ERROR.md` - Detalhes técnicos da correção
- `README.md` - Documentação geral
- `INSTRUCOES.md` - Guia de uso

---

## Log de Teste

**Data**: ____________

**Testado por**: ____________

**Versões**:
- Node: `node --version` → ____________
- Electron: Ver package.json → ____________

**Resultado**:
- [ ] ✅ Todos os testes passaram
- [ ] ⚠️ Alguns testes falharam (detalhar abaixo)
- [ ] ❌ Erro crítico (descrever)

**Observações**:
```
(espaço para anotações)
```
