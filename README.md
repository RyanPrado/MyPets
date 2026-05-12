# MyPets

Aplicação de gestão de animais de estimação (pets) — projecto académico.
Construída com Expo SDK 54 + React Native, ships para iOS, Android e web.

## Stack

- **Expo SDK 54** com New Architecture (Fabric/TurboModules) e React Compiler experimental.
- **expo-router v6** para navegação file-based, com typed routes.
- **expo-sqlite** para persistência local.
- **TypeScript estrito** com alias `@/*` apontando para a raiz do projecto.
- ESLint (`eslint-config-expo`) + Prettier + Husky + lint-staged para qualidade de código.

## Pré-requisitos

- Node 20+ (recomendado: usar a versão LTS).
- npm 10+ (vem com o Node).
- Para correr em iOS: macOS com Xcode (ou Expo Go num iPhone).
- Para correr em Android: Android Studio com um emulador, ou Expo Go num telemóvel.

## Comandos

```bash
npm install            # instalar dependências (corre `husky` automaticamente)
npm start              # iniciar o Metro bundler com QR code para Expo Go
npm run android        # iniciar com target Android
npm run ios            # iniciar com target iOS
npm run web            # iniciar a build web (export estático)
npm run lint           # ESLint
npm run format         # Prettier --write
npm run format:check   # Prettier --check (sem modificar)
npm run typecheck      # tsc --noEmit
```

## Estrutura

```
app/                    rotas (expo-router file-based)
  _layout.tsx           layout root: Stack + ThemeProvider + StatusBar
  (tabs)/               grupo de rotas em tabs
  modal.tsx             ecrã apresentado como modal
components/             componentes reutilizáveis (ThemedText, ThemedView, ...)
  ui/                   primitives multi-plataforma (IconSymbol, Collapsible)
constants/theme.ts      tokens de cores (light/dark) e fontes
hooks/                  hooks partilhados (useColorScheme, useThemeColor)
scripts/reset-project.js  script destrutivo — wipe da scaffolding inicial
```

## Convenções

- **Cores**: nunca hard-coded. Usa `Colors` em `constants/theme.ts` via o hook `useThemeColor`, ou consome através de `<ThemedText>` / `<ThemedView>`.
- **Texto**: prefere `<ThemedText type="title|subtitle|defaultSemiBold|link">` em vez de redefinir `fontSize` inline.
- **Ícones**: usa `<IconSymbol name="...">`. Ícones novos têm de ser registados em `components/ui/icon-symbol.tsx` (mapping SF Symbols → MaterialIcons), senão não renderizam em Android/web.
- **Cross-platform**: variantes específicas usam sufixos de ficheiro (`.ios.tsx`, `.web.ts`). APIs de browser (`window`, `document`) só dentro de `.web.ts` ou atrás de `Platform.OS === 'web'`.
- **Pre-commit**: `lint-staged` corre ESLint + Prettier nos ficheiros modificados antes de cada commit. Erros bloqueiam o commit.

Mais detalhe sobre arquitectura em [`CLAUDE.md`](./CLAUDE.md).

## Reset (destrutivo)

`npm run reset-project` move `app/`, `components/`, `hooks/`, `constants/`, `scripts/` para `app-example/` e cria uma scaffolding em branco. Só correr quando se quer recomeçar do zero.
