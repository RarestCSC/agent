# DSH Desktop Agent

A desktop agent starter inspired by Codex-style single-agent workflows, built around a DSH adapter architecture.

## Goals

- Single-Agent desktop experience
- DSH-first runtime abstraction
- Three-panel layout: sessions, conversation, preview
- Provider + model UI management
- Context and token awareness
- Session resume and checkpoint support
- DSH plugin compatibility without custom plugin protocol

## Stack

- Electron
- React
- Vite
- TypeScript

## Getting started

```bash
npm install
npm run dev
```

## Project structure

- `electron/` - Electron shell and preload
- `src/core/` - runtime, session, provider, context abstractions
- `src/renderer/` - UI layout and app shell

## Current status

This repository contains the initial scaffold and architecture for the first working iteration.
