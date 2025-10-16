# Correção do Erro "File is not defined"

## Problema

Ao iniciar o app Electron, ocorria o erro:

```
A JavaScript error occurred in the main process
Uncaught Exception: ReferenceError: File is not defined
    at Object.<anonymous> (...\node_modules\undici\lib\web\web...:48)
```

## Causa

- **Electron 28** utiliza **Node.js 18.x**
- Node.js 18.x **não possui** a classe `File` global
- A classe `File` foi adicionada ao Node.js apenas na **versão 20+**
- Algumas dependências (como `cheerio` que usa `undici` internamente) podem tentar acessar `File` durante a importação
- Quando o módulo `undici/lib/web/*` é carregado, ele espera que `globalThis.File` exista

## Solução Aplicada

Foi implementado um **polyfill de File** no início do arquivo `main/index.js`, antes de qualquer `require` que possa carregar dependências problemáticas.

### Código Adicionado

```javascript
// Polyfill para File/FormData (Node < 20)
try {
  if (typeof globalThis.File === 'undefined') {
    // Tenta importar do buffer nativo do Node
    const { Blob } = require('buffer');

    // Polyfill simples de File baseado em Blob
    class File extends Blob {
      constructor(bits, name, options = {}) {
        super(bits, options);
        this.name = name;
        this.lastModified = options.lastModified || Date.now();
      }
    }

    // Adiciona ao globalThis
    globalThis.File = File;
  }
} catch (error) {
  console.warn('Aviso: Não foi possível criar polyfill de File:', error.message);
}
```

### Como Funciona

1. **Verifica** se `globalThis.File` já existe
2. **Importa** `Blob` do módulo nativo `buffer` do Node.js
3. **Cria** uma classe `File` simples que estende `Blob`
4. **Adiciona** propriedades básicas: `name` e `lastModified`
5. **Registra** a classe no `globalThis` para disponibilidade global

### Por Que Esta Solução?

- ✅ **Rápida**: Não requer mudança de arquitetura
- ✅ **Compatível**: Funciona com Node 18.x (Electron 28)
- ✅ **Segura**: Usa try/catch para evitar falhas
- ✅ **Mínima**: Apenas adiciona o necessário ao global
- ✅ **Transparente**: Dependências funcionam sem modificação

## Alternativas (não implementadas)

### Opção B - Atualizar Electron

Atualizar para **Electron 31+** (que usa Node 20+):

```json
{
  "devDependencies": {
    "electron": "^31.0.0"
  }
}
```

**Prós**: `File` nativo disponível
**Contras**: Requer teste de compatibilidade, possíveis breaking changes

### Opção C - Remover Dependências que Usam File

Substituir `cheerio` por parser HTML alternativo que não use `undici/lib/web/*`

**Prós**: Sem polyfills necessários
**Contras**: Refatoração extensa do código de download

## Verificação

Para confirmar que o erro foi corrigido:

1. Execute `npm run dev`
2. O app deve iniciar sem erros no console
3. Teste as funcionalidades de download:
   - Provai e Vede (lista e download)
   - Informativo (verificação e download)
4. Verifique logs no terminal - não deve haver erros de `File`

## Notas Técnicas

- O polyfill é **apenas para o processo main** do Electron
- O **renderer** (navegador) já tem `File` nativo
- O polyfill **não afeta** o renderer devido ao `contextIsolation: true`
- Se futuramente atualizar para Electron 31+, o polyfill é ignorado automaticamente (linha 6 verifica se já existe)

## Referências

- [Node.js File API](https://nodejs.org/api/globals.html#class-file) - Disponível desde Node 20
- [Electron Versions](https://www.electronjs.org/docs/latest/tutorial/electron-timelines) - Mapeamento Electron → Node
- [Undici Web Fetch](https://github.com/nodejs/undici) - Biblioteca que requer File

---

**Data da Correção**: 2025-10-16
**Electron**: 28.0.0 (Node 18.x)
**Status**: ✅ Resolvido
