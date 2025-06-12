# Project Agents.md Guide

This Agents.md file provides comprehensive guidance for OpenAI Codex and other AI agents working with this codebase.

## Recommended Agent Flow

1. Modify or generate code in `src/`.  
2. `npm run ci` — gatekeeper for build, formatting, export validation, and unit tests.   

## Coding Standards

- Prettier is the single source of truth for formatting; manual formatting is disallowed.  
- `tsconfig.json` must remain in **strict** mode.

## Testing Requirements

Tests should be run with the following command:

```bash
npm run test
```

## Language & Style Guidelines

- Everything the agent creates - code, comments, documentation, commit messages, pull‑request descriptions, and Git branch names - **must** be written in English.
- Maintain a clear, professional, and neutral tone; avoid first‑ or second‑person address.
- Do not translate or localize domain‑specific terminology, code structure, or formats unless explicitly requested.
- Keep tone and naming conventions consistent across the entire codebase.
