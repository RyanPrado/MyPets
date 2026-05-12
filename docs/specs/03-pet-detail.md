# 03 — Pet Detail

| Campo      | Valor                                                            |
| ---------- | ---------------------------------------------------------------- |
| Status     | Aprovado (mockup) · Pendente implementação                       |
| Rota       | `app/pet/[id].tsx`                                               |
| Depende de | `01-pets-list` (entry point), `02-pet-form` (edit CTA)           |
| Tabelas    | `pets` (read, delete), `vaccines` (read, delete, listar por pet) |

## Propósito

Tela de detalhe de um único pet. Acessada via tap em qualquer linha do Pets List. Mostra a identidade do pet (avatar/foto, nome, espécie, idade, data de nascimento) e uma seção embutida de **Vacinas** com resumo (contagem total, última data administrada, próxima prevista com aviso visual quando ≤30 dias) e a lista cronológica de vacinas registradas. Entry points: editar pet (overflow `⋯` → bottom sheet), excluir pet (overflow → confirmação `Alert.alert`; CASCADE remove vacinas), adicionar vacina (CTA `+ Adicionar` inline → Vaccine Form modal), editar/excluir vacina (long-press numa linha → bottom sheet).

A tela tem três estados visualmente distintos. O **estado primário** mostra hero + resumo + lista. O estado **sem vacinas** substitui resumo+lista por um empty state inline dentro da própria seção (com CTA "Adicionar primeira vacina"). O estado **bottom sheet aberto** (vacina ou overflow do pet) é overlay transitório.

## Wireframe

Estado primário (com vacinas registradas):

```text
+--------------------------+
|  ←      Rex         ⋯    |  ← header: voltar / nome / overflow
+--------------------------+
|  [foto Rex]   Rex        |
|               Cão · 6 anos
|               Nasceu     |
|               15/03/2020 |
+--------------------------+
|  💉 VACINAS   + Adicionar|  ← cabeçalho da seção
+--------------------------+
| [  Resumo               ]|
| [   12   ⚠ Próxima 34d  ]|
| [ Última   15/01/2026   ]|
| [ Próxima  15/06/2026   ]|
+--------------------------+
|  Antirrábica   R$ 25,00  |
|  15/01/2026              |
|  próxima 15/06/2026      |
+--------------------------+
|  Pentavalente  R$ 35,00  |
|  10/07/2025              |
+--------------------------+
|  ... (scroll)            |
+--------------------------+
```

Estado **sem vacinas**: hero permanece igual. A seção Vacinas mostra o cabeçalho (ícone `vaccines` + "Vacinas" + CTA "Adicionar"). Abaixo, dentro da mesma seção, um bloco com borda tracejada centralizado: ícone `vaccines` grande em `muted-foreground`, título "Sem vacinas registradas", parágrafo "Adicione a primeira vacina do <Nome> para começar o histórico." e CTA primário "+ Adicionar primeira vacina".

Estado **bottom sheet de vacina**: scrim ~60%, sheet sobe com drag handle, preview da vacina (ícone redondo `vaccines` em fundo cyan + nome + datas + valor em `text-primary`), depois duas ações: "Editar vacina" (neutra, ícone `edit`) e "Excluir vacina" (destrutiva, ícone `delete`, `text-destructive`). Estado **bottom sheet do overflow do pet**: mesma estrutura mas preview é o pet (avatar + nome + meta) e ações são "Editar pet" / "Excluir pet".

## Componentes

### Primitivos reutilizados

- `<FlatList>` para a lista de vacinas. `ListHeaderComponent` envolve o hero + cabeçalho da seção + resumo. `ListEmptyComponent` para o estado sem vacinas.
- `<IconSymbol>` para os ícones.
- `<Avatar>` (do spec 01) — usado no hero (`size="lg"`, novo tamanho ~64 px) e no preview do overflow sheet (`size="sm"`).
- `<PetActionsSheet>` (do spec 01) — reaproveitado para o overflow `⋯`. Mesmo componente, invocado a partir do detail via ref imperativa.

### Novos componentes a criar

- **`VaccineSummary`** (`components/vaccine-summary.tsx`) — Card (`bg-card rounded-lg p-3`). Topo: número grande (`text-2xl font-bold text-primary`) à esquerda + chip de alerta à direita (visível somente se `next_due_date` ≤30 dias; `bg-warning-foreground text-warning` com ícone `warning`). Abaixo: duas linhas chave/valor — "Última administrada" / data e "Próxima prevista" / data (ou "—" se nula). Props: `count: number`, `lastDate: string | null`, `nextDate: string | null`.
- **`VaccineRow`** (`components/vaccine-row.tsx`) — `Pressable` com `bg-card rounded-md p-2.5`. À esquerda: nome (`font-semibold`) + meta (data formatada PT-BR; se `next_due_date` definida, anexa " · próxima DD/MM/AAAA"). À direita: valor em `text-primary font-bold` (oculto se `amount_paid_cents` é null). Props: `vaccine: Vaccine`, `onPress`, `onLongPress`.
- **`VaccineActionsSheet`** (`components/vaccine-actions-sheet.tsx`) — Igual em forma ao `PetActionsSheet` mas o preview usa ícone redondo `vaccines` em vez de `Avatar` e o callback `onDelete` opera sobre `vaccines`. `forwardRef` expõe `present(vaccine)` / `dismiss()`. Props: `onEdit`, `onDelete`.
- **Helpers** (`lib/utils/format.ts`) — `formatDate(iso: string): string` (PT-BR `dd/MM/yyyy`), `formatCurrencyCents(cents: number | null): string` (PT-BR `R$ 25,50`; `""` se null), `computeAge(birthIso: string | null): string` (PT-BR `"6 anos"` ou `"8 meses"`; `""` se null). Implementados via `Intl.DateTimeFormat('pt-BR')` e `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

### Mapeamentos de ícones a adicionar em `components/ui/icon-symbol.tsx`

| SF Symbol (iOS)                 | Material Symbol (Android/web) |
| ------------------------------- | ----------------------------- |
| `chevron.left`                  | `arrow-back`                  |
| `ellipsis`                      | `more-horiz`                  |
| `cross.case.fill`               | `vaccines`                    |
| `exclamationmark.triangle.fill` | `warning`                     |

### Tokens de tema adicionais

- `--color-warning` (light: `#d97706`, dark: `#fbbf24`)
- `--color-warning-foreground` (light: `#fef3c7`, dark: `#451a03`)

Adicionados em `global.css` no bloco `@theme` e no override `@media (prefers-color-scheme: dark)`.

## Dados

### Queries

```sql
SELECT id, name, species, birth_date, photo_uri
FROM pets
WHERE id = ?;

SELECT id, name, date_given, amount_paid_cents, next_due_date
FROM vaccines
WHERE pet_id = ?
ORDER BY date_given DESC;
```

Ambas executadas no mount e em `useFocusEffect` (retorno do Pet Form ou Vaccine Form). Tipos: `Pet`, `Vaccine[]` de `lib/db-types.ts`. Datas armazenadas como `TEXT` ISO `YYYY-MM-DD` (formato SQLite-friendly e ordenável); a formatação PT-BR `DD/MM/AAAA` é só de apresentação.

### Mutations

```sql
DELETE FROM pets WHERE id = ?;       -- CASCADE remove vacinas
DELETE FROM vaccines WHERE id = ?;
```

Ambas envolvidas em `Alert.alert` de confirmação ("Excluir?" / "Esta ação é irreversível."). Exclusão do pet navega de volta ao Pets List após sucesso.

### Migrations required

- **`0002-create-vaccines-table`** — segunda migração do projeto:

  ```sql
  CREATE TABLE vaccines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date_given TEXT NOT NULL,
    amount_paid_cents INTEGER,
    next_due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_vaccines_pet_id ON vaccines(pet_id);
  ```

  Adicionalmente, garantir `PRAGMA foreign_keys = ON` em `lib/migrations/index.ts` (executado antes do loop de migrações). Sem essa pragma, SQLite ignora `ON DELETE CASCADE` silenciosamente. Atualizar `lib/db-types.ts` exportando `Vaccine = { id: number; pet_id: number; name: string; date_given: string; amount_paid_cents: number | null; next_due_date: string | null; created_at: string }`.

## Interações

| Trigger                                    | Ação                                                                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tap `←`                                    | `router.back()` (ou navega para `/(tabs)/` se sem stack history)                                                                                   |
| Tap `⋯`                                    | `petActionsSheetRef.current?.present(pet)` — sheet com "Editar pet" / "Excluir pet"                                                                |
| Em sheet do pet: "Editar pet"              | Dismiss; `router.push('/pet-form?id=' + pet.id)`                                                                                                   |
| Em sheet do pet: "Excluir pet"             | Dismiss; `Alert.alert('Excluir?', 'Esta ação é irreversível. As vacinas também serão removidas.', [Cancelar, Excluir])` — confirma → DELETE + back |
| Tap `+ Adicionar` (cabeçalho da seção)     | `router.push('/vaccine-form?petId=' + pet.id)` (modo criar)                                                                                        |
| Tap "Adicionar primeira vacina" (empty)    | Mesma navegação que acima                                                                                                                          |
| Tap numa linha de vacina                   | `router.push('/vaccine-form?id=' + vaccine.id + '&petId=' + pet.id)` (modo editar)                                                                 |
| Long-press numa linha de vacina            | `vaccineActionsSheetRef.current?.present(vaccine)` — sheet com "Editar vacina" / "Excluir vacina"                                                  |
| Em sheet da vacina: "Excluir vacina"       | Dismiss; `Alert.alert('Excluir?', 'Esta ação é irreversível.', [Cancelar, Excluir])` — confirma → DELETE + refetch                                 |
| Pull-to-refresh                            | Refaz ambas as queries (pet + vacinas)                                                                                                             |
| Retorno do Vaccine Form (`useFocusEffect`) | Refaz a query de vacinas                                                                                                                           |

## Estados

| Estado             | Quando                                    | UI                                                                                                           |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Loading            | Antes da primeira resposta das queries    | Hero skeleton + 1 skeleton row na seção. Aceitável para MVP.                                                 |
| Primário (cheio)   | Pet carregado, ≥1 vacina                  | Hero + `VaccineSummary` + `FlatList` de `VaccineRow`s                                                        |
| Sem vacinas        | Pet carregado, 0 vacinas                  | Hero + cabeçalho da seção + bloco empty inline com CTA                                                       |
| Sheet aberto       | Long-press numa vacina ou tap no overflow | Scrim + bottom sheet sobre o conteúdo                                                                        |
| Pet não encontrado | Query do pet retorna 0 linhas             | Tela centrada com "Pet não encontrado" + CTA "Voltar à lista" (caso o pet tenha sido excluído noutra sessão) |
| Erro               | Qualquer query lança                      | Inline `<Text>` "Não foi possível carregar os dados deste pet." + retry `<Pressable>`                        |

## Acessibilidade

- Header `←`: `accessibilityLabel="Voltar"`, hit area mínima 48×48.
- Header `⋯`: `accessibilityLabel="Mais ações"`, hit area mínima 48×48.
- Hero: `accessibilityRole="header"` no nome (H1 lógico da tela).
- Resumo: `accessibilityLabel` interpolado: `"${count} vacinas registradas. Última em ${lastDate}. Próxima prevista para ${nextDate}."`. O chip de alerta tem `accessibilityLabel="Próxima vacina em ${days} dias"`.
- Linhas de vacina: `accessibilityRole="button"`, `accessibilityLabel={\`${name}, administrada em ${date}\`}`, `accessibilityHint="Toque para editar, segure para opções"`.
- Empty state CTA: `accessibilityLabel="Adicionar primeira vacina do ${name}"`.
- Bottom sheets herdam a a11y de `@gorhom/bottom-sheet` v5 (foco gerido, leitor de tela informado).

## Fora do escopo

- Compartilhar histórico de vacinas (PDF, e-mail).
- Notificações push para próximas vacinas — `expo-notifications` está instalado mas não usado no MVP.
- Editar foto/nome do pet diretamente nesta tela (sempre via Pet Form).
- Filtros/ordenação da lista de vacinas (ordem fixa: mais recente primeiro).
- Gráficos ou estatísticas (custo total, distribuição por tipo).
- Anexar comprovante (imagem do recibo) à vacina.
- Vacinas partilhadas entre pets — cada vacina pertence exatamente a 1 pet.

## Implementation checklist

```markdown
- [ ] `/db-migration "create vaccines table"` — produz `lib/migrations/0002-create-vaccines-table.ts` com SQL acima (FK CASCADE + INDEX) e atualiza `lib/db-types.ts` com o tipo `Vaccine`
- [ ] Adicionar `await db.execAsync('PRAGMA foreign_keys = ON');` no início de `runMigrations` em `lib/migrations/index.ts` (antes do loop)
- [ ] Adicionar entradas ao `MAPPING` em `components/ui/icon-symbol.tsx`: `chevron.left → arrow-back`, `ellipsis → more-horiz`, `cross.case.fill → vaccines`, `exclamationmark.triangle.fill → warning`
- [ ] Adicionar tokens `--color-warning` e `--color-warning-foreground` em `global.css` (light + dark)
- [ ] Criar `lib/utils/format.ts` exportando `formatDate`, `formatCurrencyCents`, `computeAge` (PT-BR via `Intl.*` com locale `pt-BR`)
- [ ] `/new-themed-component VaccineSummary View` — estender com props `count`, `lastDate`, `nextDate`
- [ ] `/new-themed-component VaccineRow Pressable` — estender com props `vaccine`, `onPress`, `onLongPress`
- [ ] Criar `components/vaccine-actions-sheet.tsx` manualmente (espelha estrutura de `PetActionsSheet` do spec 01)
- [ ] Criar `app/pet/[id].tsx` (rota dinâmica). Ler `id` via `useLocalSearchParams<{ id: string }>()`. Estrutura: `<FlatList>` com `ListHeaderComponent` (hero + cabeçalho da seção + summary) + `ListEmptyComponent` (empty inline) + `renderItem` (`VaccineRow`). Refs para `PetActionsSheet` (do spec 01) e `VaccineActionsSheet`
- [ ] (Opcional dev) `npm run make:seed:dev -- "vaccines for rex"` — popula 5–6 vacinas em qualquer pet existente para validar visualmente o estado primário
- [ ] Validar: `npm run lint`, `npm run typecheck`. Reiniciar Metro. Exercitar: empty state inline → form → volta com vacina criada; long-press → sheet → excluir → row removida; overflow → sheet → excluir pet → volta para lista com pet removido
- [ ] NÃO commitar até o usuário rever o app rodando contra esta spec.
```

Ao implementar, trate esta spec como contrato. Se a implementação revelar lacuna não-trivial não coberta aqui, pare, atualize a spec via commit e depois retome o código.
