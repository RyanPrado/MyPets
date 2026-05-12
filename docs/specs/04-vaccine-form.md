# 04 — Vaccine Form

| Campo      | Valor                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| Status     | Aprovado (mockup) · Pendente implementação                                     |
| Rota       | `app/vaccine-form.tsx` (modal stack, registrada em `app/_layout.tsx`)          |
| Depende de | `03-pet-detail` (entry point + migração `0002-create-vaccines-table`)          |
| Tabelas    | `vaccines` (`INSERT` criar, `UPDATE` editar, `SELECT` prefill) + `pets` (read) |

## Propósito

Tela modal para criar ou editar um registro de vacina pertencente a um pet específico. O modo é determinado pela presença do route param `id` (sem `id` → criar; com `id` → editar). O `petId` é sempre obrigatório (passado pelo Pet Detail via `router.push('/vaccine-form?petId=...')`). Captura nome (livre), data administrada (obrigatória), valor pago em BRL (opcional, convertido para centavos), e próxima dose prevista (opcional). Ao submeter, valida client-side, persiste em `vaccines` e fecha o modal voltando ao Pet Detail (que refaz a query via `useFocusEffect`).

## Wireframe

Criar (campos vazios, Salvar desabilitado):

```text
+--------------------------+
|Cancelar Nova vacina Salvar|
+--------------------------+
| 🐾 Para o Rex            |  ← chip de contexto não-editável
+--------------------------+
| NOME DA VACINA *         |
| [ ex.: Antirrábica    ]  |
|                          |
| DATA ADMINISTRADA *      |
| [ dd/mm/aaaa          ]  |
|                          |
| VALOR PAGO (opcional)    |
| [ R$ 0,00             ]  |
|                          |
| PRÓXIMA DOSE (opcional)  |
| [ dd/mm/aaaa          ]  |
|                          |
|       [ Salvar ]         |  ← disabled cinza
+--------------------------+
```

Editar (pré-preenchido): mesma estrutura, valores preenchidos e Salvar ativo com label "Salvar alterações".

Validação inline (variante C): após tentar salvar com nome vazio, o input do nome ganha `border-destructive` + mensagem `⚠ Informe o nome da vacina.` abaixo. Mesmo padrão para data inválida ou no futuro. Sem `Alert.alert` — toda validação é inline.

## Componentes

### Primitivos reutilizados

- `<View>`, `<TextInput>`, `<Pressable>`, `<ScrollView>` de `react-native` com Tailwind.
- `<IconSymbol>` para o ícone `pets` no chip e `error` na mensagem de validação.
- `Alert.alert` apenas para erros de I/O do banco (não para validação de form).

### Novos componentes a criar

Nenhum novo componente reutilizável. A tela é composta diretamente em `app/vaccine-form.tsx` com `<TextInput>`s nativos. Mantém o screen simples, sem abstração prematura.

### Helpers a adicionar em `lib/utils/format.ts`

Estendem o módulo criado no spec 03. Novos exports:

- `parseDateInput(input: string): string | null` — recebe `"15/03/2020"` (formato PT-BR), retorna `"2020-03-15"` ISO ou `null` se inválido (não-data, regex falha, ou parse falha). Usado nos onSubmit e onBlur dos campos de data.
- `parseCurrencyInput(input: string): number | null` — recebe `"R$ 25,50"`, `"25,50"`, `"25"` ou `""`, retorna o valor em centavos (`2550`) ou `null` se vazio/inválido. Tolerante a `R$ `, espaços, vírgula ou ponto decimal.

### Mapeamentos de ícones a adicionar em `components/ui/icon-symbol.tsx`

| SF Symbol (iOS)               | Material Symbol (Android/web) |
| ----------------------------- | ----------------------------- |
| `exclamationmark.circle.fill` | `error`                       |

O ícone `pets` já foi mapeado pelo spec 01.

### Tokens de tema adicionais

Nenhum. Tokens `--color-destructive` (existente) + `--color-primary` (existente) cobrem tudo.

## Dados

### Queries

Sempre carrega o pet para o chip de contexto:

```sql
SELECT id, name FROM pets WHERE id = ?;
```

Se em modo edit (`id` presente):

```sql
SELECT id, pet_id, name, date_given, amount_paid_cents, next_due_date
FROM vaccines
WHERE id = ?;
```

Resultados populam o estado do form. Se a vacina não for encontrada (ex.: excluída entre o long-press e a abertura do modal), mostra erro inline e dismiss automático após 1.5 s.

### Mutations

Criar:

```sql
INSERT INTO vaccines (pet_id, name, date_given, amount_paid_cents, next_due_date)
VALUES (?, ?, ?, ?, ?);
```

Editar:

```sql
UPDATE vaccines
SET name = ?, date_given = ?, amount_paid_cents = ?, next_due_date = ?
WHERE id = ?;
```

`pet_id` nunca é mutado em edit (a vacina permanece com o pet original). Todos os valores parametrizados. `amount_paid_cents` e `next_due_date` podem ser `null`. `created_at` vem do `DEFAULT CURRENT_TIMESTAMP` da migração 0002.

### Migrations required

Nenhuma nova. Migração `0002-create-vaccines-table` já criada pelo checklist do spec 03.

### Validação (client-side, antes do submit)

| Campo               | Regra                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | Trim → não vazio, ≤ 100 caracteres. Erro: "Informe o nome da vacina."                                                                                      |
| `date_given`        | Obrigatório. `parseDateInput` deve retornar valor; data resultante ≤ hoje. Erro: "Data inválida." ou "A data não pode estar no futuro."                    |
| `amount_paid_cents` | Opcional. Se preenchido: `parseCurrencyInput` deve retornar valor ≥ 0. Erro: "Valor inválido."                                                             |
| `next_due_date`     | Opcional. Se preenchido: `parseDateInput` válido AND data > `date_given`. Erro: "Data inválida." ou "A próxima dose deve ser depois da data administrada." |

Salvar arranca disabled em criar até `name` (não vazio) e `date_given` (válido) terem valor. Em edit, sempre habilitado (padrão UX) — se o user editar para estado inválido, a validação dispara no tap.

## Interações

| Trigger                                             | Ação                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Tap "Cancelar" (header esquerda)                    | `router.back()` imediato (MVP: sem confirmação de form sujo)                                                                           |
| Tap "Salvar" / "Salvar alterações" (header direita) | Roda validação completa. Inválido → mostra erros inline em cada campo. Válido → `INSERT`/`UPDATE` em transação, depois `router.back()` |
| Tap no chip "Para o Rex"                            | No-op (chip é apenas informativo)                                                                                                      |
| Tap num campo                                       | Foca o `<TextInput>`; o input ganha `border-primary`                                                                                   |
| Blur de um campo com erro                           | Re-roda a validação só desse campo; remove o erro inline se válido                                                                     |
| Modificação que torna o form válido                 | Limpa todos os erros inline; habilita Salvar (criar)                                                                                   |
| Tap no campo de valor                               | MVP: foca o input e abre teclado numérico (`keyboardType="decimal-pad"`). Sem máscara em tempo real — parse no submit/blur             |
| Tap no campo de data                                | MVP: foca o input e abre teclado numérico. Validação no blur                                                                           |

## Estados

| Estado                | Quando                                     | UI                                                                                                              |
| --------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Criar — vazio         | Mount sem `id`                             | Campos vazios com placeholders, Salvar disabled                                                                 |
| Criar — parcial       | Usuário digitou em algum campo             | Salvar habilita quando `name` não vazio AND `date_given` válido                                                 |
| Editar — loading      | Mount com `id`, antes do `SELECT` resolver | Form mostra esqueleto (4 caixas muted). Header mostra "Editar vacina" + "Cancelar" mas não o Salvar             |
| Editar — carregado    | `SELECT` resolveu                          | Form populado com valores formatados PT-BR. Salvar habilitado                                                   |
| Submetendo            | Salvar tocado, esperando DB write          | Salvar mostra spinner + label "Salvando..."; form fica `pointerEvents: 'none'`                                  |
| Inválido              | Salvar tocado com erro de validação        | Cada campo inválido ganha borda destructive + mensagem inline. Salvar não escreve                               |
| Vacina não encontrada | `SELECT` em edit não retorna linha         | Erro inline "Vacina não encontrada." + auto-dismiss em 1.5 s                                                    |
| Pet não encontrado    | `SELECT` do pet retorna nada               | Erro fatal "Pet não encontrado." + dismiss imediato. Não deveria acontecer (entry point garante `petId` válido) |

## Acessibilidade

- Cada `<TextInput>` tem um `<Text>` visível acima como label, com o mesmo texto passado em `accessibilityLabel`.
- Campos obrigatórios têm `accessibilityLabel` interpolado: `"Nome da vacina, obrigatório"`.
- Mensagens de erro inline usam `accessibilityLiveRegion="polite"` (Android) e são lidas automaticamente quando aparecem.
- Botão Cancelar: `accessibilityLabel="Cancelar"`, hit area mínima 48×48.
- Botão Salvar: `accessibilityLabel` espelha o texto visível (`"Salvar"` ou `"Salvar alterações"`). `accessibilityState={{ disabled }}` reflete a validade atual.
- Chip de contexto: `accessibilityRole="text"`, `accessibilityLabel="Vacina para ${petName}"`. Marcar `importantForAccessibility="yes"` para garantir leitura no início.
- Ordem visual top-to-bottom == ordem de leitura para screen-reader.
- Teclado: cada campo tem `returnKeyType` apropriado (`"next"` exceto o último que é `"done"`) e os refs encadeiam o foco.

## Fora do escopo

- Máscara de moeda em tempo real (formata enquanto digita). MVP: parse no blur/submit.
- Native `DateTimePicker` para campos de data. MVP: TextInput livre `dd/mm/aaaa`.
- Confirmação de form sujo no Cancelar.
- Anexar comprovante / recibo (imagem da nota fiscal) à vacina.
- Sugestão automática de "próxima dose" baseada no nome da vacina (catálogo de antirrábica, polivalente, etc.). Free-text agora; catálogo é polish futuro.
- Múltiplas vacinas num único submit (bulk).
- Histórico de alterações / audit log da vacina.
- Trocar o pet associado a uma vacina existente (em edit, `pet_id` é imutável).
- Notificação push de lembrete antes da próxima dose (`expo-notifications` instalado mas não usado no MVP).

## Implementation checklist

```markdown
- [ ] Confirmar que `lib/migrations/0002-create-vaccines-table.ts` existe (criado pelo checklist do spec 03)
- [ ] Adicionar entrada ao `MAPPING` em `components/ui/icon-symbol.tsx`: `exclamationmark.circle.fill → error`
- [ ] Estender `lib/utils/format.ts` com `parseDateInput(input)` e `parseCurrencyInput(input)` (descritos acima). Cobrir edge cases: string vazia, formato errado, números fora de faixa
- [ ] Registrar a rota em `app/_layout.tsx` Stack: `<Stack.Screen name="vaccine-form" options={{ presentation: 'modal', title: 'Vacina' }} />`
- [ ] Criar `app/vaccine-form.tsx`:
  - Ler `petId` e `id` opcional via `useLocalSearchParams<{ petId: string; id?: string }>()`
  - `useEffect` carrega o pet (sempre) e a vacina (se `id`)
  - Estado local com 4 campos + objeto de erros por campo
  - Validação on-blur e on-submit; toggle do Salvar habilitado
  - Submit: parse → validar → `INSERT`/`UPDATE` em `withTransactionAsync` → `router.back()`
- [ ] (Opcional) Adicionar testes unitários para `parseDateInput` e `parseCurrencyInput` em `lib/utils/format.test.ts` (via `/test-writer`) — funções puras de fácil cobertura
- [ ] Validar: `npm run lint`, `npm run typecheck`. Reiniciar Metro. Smoke test em web + ao menos um alvo nativo:
  - Abrir do Pet Detail "+ Adicionar" → preencher → salvar → ver no resumo + lista
  - Abrir do long-press numa vacina → "Editar vacina" → modificar → salvar → ver atualizado
  - Tentar salvar com nome vazio → erro inline aparece
  - Cancelar não persiste
- [ ] NÃO commitar até o usuário rever o app rodando contra esta spec.
```

Ao implementar, trate esta spec como contrato. Lacunas não-triviais exigem atualizar a spec antes do código.
