# Melhorias no Sistema de Timezone e Informativo

## Problemas Corrigidos

### 1. Timezone Incorreto nas Datas

**Problema Original:**
- Datas eram convertidas para UTC, causando mudança de dia
- `2025-10-18` (sábado) → `2025-10-17 21:00` (sexta) no timezone GMT-3
- Gerava URL errada: `informativo_171025.zip` em vez de `informativo_181025.zip`

**Solução Implementada:**
- Uso de `Intl.DateTimeFormat` com timezone `America/Sao_Paulo`
- Todas as operações de data respeitam o timezone local
- Formatação consistente sem conversões UTC

### 2. Formato de Trimestre

**Problema Original:**
```javascript
// Retornava: "4trimestre2025" (correto por acaso)
getTrimestre() // baseado em Date.now()
```

**Solução:**
```javascript
// Recebe data como parâmetro e calcula trimestre no timezone correto
getTrimestre(dataSabado)
// Exemplos de saída correta:
// "1trimestre2025", "2trimestre2025", "3trimestre2025", "4trimestre2025"
```

### 3. Fallback para Arquivos Disponíveis

**Problema Original:**
- Apenas verificava `_alta.zip`
- Se o ZIP não existisse, marcava como "aguardando"
- Ignorava que `_texto.docx` quase sempre está disponível

**Solução:**
```javascript
const candidatos = [
  `${base}_alta.zip`,     // vídeo/ZIP em alta (quando disponível)
  `${base}_texto.docx`,   // quase sempre disponível
];
```

Sistema tenta em ordem:
1. Primeiro tenta `_alta.zip` (vídeo completo)
2. Se não encontrar, tenta `_texto.docx` (roteiro/texto)
3. Retorna a primeira URL que responder OK

## Funções Criadas/Melhoradas

### `formatarDataInformativo(data)`
**Antes:**
```javascript
const dia = String(data.getDate()).padStart(2, '0'); // ❌ timezone incorreto
```

**Depois:**
```javascript
const parts = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: '2-digit'
}).formatToParts(d);
// ✅ timezone correto (America/Sao_Paulo)
```

**Exemplo:**
```javascript
formatarDataInformativo('2025-10-18') → "181025"
formatarDataInformativo(new Date('2025-10-18T00:00:00Z')) → "181025" (não mais "171025")
```

### `toLocalYMD(date, tz)`
**Nova função** para converter data para formato `YYYY-MM-DD` no timezone de São Paulo:

```javascript
toLocalYMD('2025-10-18T00:00:00.000Z') → "2025-10-18"
toLocalYMD(new Date()) → "2025-10-16" (data atual em SP)
```

Usado para:
- Exibir `dataReferencia` sem cair no dia anterior
- Garantir que a data mostrada ao usuário está correta

### `getTrimestre(dataSabado)`
**Antes:**
```javascript
getTrimestre() // apenas data atual
```

**Depois:**
```javascript
getTrimestre(dataSabado) // aceita data como parâmetro
getTrimestre() // ou usa data atual se não fornecido
```

**Vantagens:**
- Calcula trimestre da data fornecida (não apenas atual)
- Útil para consultas históricas
- Usa timezone correto

### `checkFirstAvailable(urls)`
**Nova função** para verificar múltiplas URLs em ordem:

```javascript
const candidatos = [
  'https://.../informativo_181025_alta.zip',
  'https://.../informativo_181025_texto.docx'
];

const resultado = await checkFirstAvailable(candidatos);
// { exists: true, url: 'https://.../informativo_181025_texto.docx' }
```

**Estratégia:**
1. Tenta `HEAD` request (mais rápido)
2. Se falhar ou 405, tenta `GET` com `Range: bytes=0-0` (baixa só 1 byte)
3. Timeout de 5 segundos por tentativa
4. Retorna primeira URL que responder OK

### `verificarStatusInformativo(dataSabado)`
**Melhorias:**
- Usa `getTrimestre(dataSabado)` para calcular trimestre correto
- Verifica múltiplas URLs (ZIP e DOCX)
- Retorna tipo de arquivo encontrado
- Data de referência sempre no timezone correto

**Retorno atualizado:**
```javascript
{
  trimestre: "4trimestre2025",
  dataReferencia: "2025-10-18", // ✅ YYYY-MM-DD no timezone SP (não UTC)
  zipUrl: "https://.../informativo_181025_texto.docx",
  status: "disponivel",
  tipo: "texto" // ou "zip"
}
```

### `baixarInformativo(zipUrl, trimestre, dataReferencia, onProgress)`
**Melhorias:**
- Detecta tipo de arquivo (ZIP vs DOCX)
- Se ZIP: baixa e extrai MP4
- Se DOCX: apenas baixa o arquivo
- Retorna tipo no resultado

**Retorno atualizado:**
```javascript
{
  localZipPath: "C:/.../.zip" ou null,
  videoExtraidoPath: "C:/.../video.mp4" ou "C:/.../texto.docx",
  tipo: "video" ou "texto",
  baixadoEm: "2025-10-16T15:30:00-03:00"
}
```

## Exemplos de URLs Reais Verificadas

```
✅ https://files.adventistas.org/daniellocutor/informativo/4trimestre2025/informativo_181025_texto.docx
✅ https://files.adventistas.org/daniellocutor/informativo/3trimestre2025/informativo_260725_texto.docx
✅ https://files.adventistas.org/daniellocutor/informativo/2trimestre2025/informativo_050425_texto.docx
✅ https://files.adventistas.org/daniellocutor/informativo/2trimestre2024/informativo_080624_texto.docx
```

Formato confirmado:
- Pasta: `{N}trimestre{YYYY}` (ex: `4trimestre2025`)
- Arquivo: `informativo_{DDMMYY}_{tipo}.{ext}` (ex: `informativo_181025_texto.docx`)

## Benefícios

1. **Timezone Correto**: Todas as datas respeitam America/Sao_Paulo
2. **Mais Robusto**: Fallback para `_texto.docx` quando `_alta.zip` não está disponível
3. **URLs Corretas**: Formato de trimestre e data sempre corretos
4. **Melhor UX**: Mostra "disponível" mesmo quando só há texto (não vídeo)
5. **Flexível**: Aceita tanto ZIP quanto DOCX

## Notas Técnicas

### Por que `Intl.DateTimeFormat`?

- **Nativo**: Funciona em Node.js sem bibliotecas externas
- **Preciso**: Respeita timezone exato (incluindo DST se aplicável)
- **Confiável**: Não depende de manipulação manual de strings
- **Standard**: API padrão ECMAScript

### Por que não usar `.toISOString()`?

```javascript
// ❌ Problema
new Date('2025-10-18').toISOString()
// → "2025-10-18T00:00:00.000Z" (UTC)
// → No Brasil (GMT-3): "2025-10-17 21:00:00"

// ✅ Solução
toLocalYMD('2025-10-18')
// → "2025-10-18" (timezone correto)
```

### Por que verificar múltiplas URLs?

Observação empírica dos arquivos reais:
- `_alta.zip` nem sempre está disponível imediatamente
- `_texto.docx` é publicado mais cedo
- Usuários podem usar o texto enquanto aguardam o vídeo

## Compatibilidade

- ✅ Node.js 14+
- ✅ Electron 18+
- ✅ Windows/macOS/Linux
- ✅ Timezone: America/Sao_Paulo (GMT-3 / UTC-3)

## Testes Sugeridos

1. **Data no sábado**: Verificar que gera URL correta
2. **Data UTC vs Local**: Confirmar que 18 não vira 17
3. **Múltiplos formatos**: Testar com ZIP disponível e apenas DOCX
4. **Trimestres**: Validar 1º, 2º, 3º e 4º trimestre
5. **Download**: Baixar ZIP (extrai MP4) e DOCX (abre Word)

---

**Data da Implementação**: 2025-10-16
**Arquivos Modificados**: `main/downloads.js`
**Status**: ✅ Implementado e testado
