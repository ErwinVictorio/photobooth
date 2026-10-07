import { build } from 'vite'
await build({ configFile: false, publicDir: false, build: { outDir: 'artifacts/renderer-fixture', emptyOutDir: true, lib: { entry: 'scripts/template-renderer-fixture.js', name: 'RendererFixture', formats: ['iife'], fileName: () => 'fixture.js' } } })
