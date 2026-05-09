# Missing React Components — Dobeu Design System v1

All 12 Figma design-system components are **unmatched** in `src/components/`.
No `*.figma.tsx` Code Connect files could be generated.

## Unmatched components

| Figma component | Expected React file | Expected export |
|---|---|---|
| Icon | `src/components/Icon.tsx` | `Icon` |
| Button | `src/components/Button.tsx` | `Button` |
| Badge | `src/components/Badge.tsx` | `Badge` |
| Avatar | `src/components/Avatar.tsx` | `Avatar` |
| Checkbox | `src/components/Checkbox.tsx` | `Checkbox` |
| Radio | `src/components/Radio.tsx` | `Radio` |
| Toggle | `src/components/Toggle.tsx` or `Switch.tsx` | `Toggle` / `Switch` |
| Input | `src/components/Input.tsx` | `Input` |
| Textarea | `src/components/Textarea.tsx` | `Textarea` |
| Tag | `src/components/Tag.tsx` or `Chip.tsx` | `Tag` / `Chip` |
| Card | `src/components/Card.tsx` | `Card` |
| Tooltip | `src/components/Tooltip.tsx` | `Tooltip` |

## Current contents of `src/components/`

These files exist but do not correspond to design-system primitives:

- `ApiKeyPrompt.tsx`
- `ChatInput.tsx`
- `CookieConsent.tsx`
- `MessageList.tsx`
- `MultiAgentChat.tsx`
- `PWAProvider.tsx`
- `ProviderSelector.tsx`
- `UserDashboard.tsx`

## Additional blockers

1. **State file was missing** — `.agent/dsb-state-dobeu-v1.json` did not exist.
   A bootstrapped version with placeholder Figma node IDs has been created.
   All `TODO:node-id-<Name>` values must be replaced with real Figma component-set
   node IDs before Code Connect files can be published.

2. **No Figma MCP access from remote agent** — the live token sweep and contrast
   recheck must be run interactively inside the Figma desktop plugin by a human.

## What to do next

1. Implement the 12 React components above in `src/components/`.
2. Open `.agent/dsb-state-dobeu-v1.json` and fill in the real Figma node IDs.
3. Re-run the Code Connect scaffolding agent (or create `figma/<Name>.figma.tsx`
   manually using the skeleton in the PR description).
4. Run `npx @figma/code-connect publish` once bindings are finalised in the
   Figma desktop plugin.
