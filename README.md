# This Moment

This repository will contain a responsive AI interaction prototype for end-of-life care conversations. The project is independent from the reference project and reuses only its general engineering workflow.

## Current status

The responsive application shell and the first complete core activity, "此刻的我", are implemented. The current prototype includes session-only content, explicit generation and copy confirmation, and a limited shared crisis interruption; the remaining three core activities are tracked in GitHub Issues.

## Commands

```sh
npm install
npm run dev
npm run check
```

No deployment target, external AI service, account system, backend, or sensitive-data storage is configured. Prototype content is deterministic and local to the current page session.
