// api/test/__mocks__/langchainMistralAI.js
/**
 * Jest stand-in for `@langchain/mistralai`.
 *
 * `@librechat/agents` (>=3.4.7) loads its Mistral provider adapter eagerly
 * from `dist/cjs/main.cjs`, which requires `@langchain/mistralai`, which in
 * turn requires `@mistralai/mistralai` — published `"type": "module"` with no
 * CommonJS build. Jest's CJS runtime cannot load that chain, so every suite
 * that transitively imports `@librechat/agents` (including a plain
 * `jest.requireActual('@librechat/agents')`) died at collection with
 * `SyntaxError: Unexpected token 'export'`, regardless of whether the test
 * touched Mistral.
 *
 * Transforming the package does not help: Node decides module kind from the
 * package's `type` field, not from what a transform emits, so a CommonJS
 * rewrite is still evaluated as ESM and fails with
 * `ReferenceError: exports is not defined`.
 *
 * Mirrors the identical fix upstream applied to its own test suite for the
 * same root cause (danny-avila/agents#343, "Transform ESM-Only Dependencies
 * So Jest Can Load Them") and the equivalent stub added for the
 * `packages/api` workspace in this fork (test/stubs/mistralai.ts). That
 * upstream fix lives in the agents repo's dev tooling and is not shipped in
 * the published npm package, so every consuming jest config needs its own
 * copy.
 *
 * Stubbing is safe here because nothing under test constructs this class:
 * this fork's `providerConfigMap` (packages/api/src/endpoints/config/providers.ts)
 * does not route to Mistral at all, and `ChatMistralAI` appears solely as an
 * unused map value inside `@librechat/agents`'s own provider registry.
 *
 * Throws rather than no-ops so the assumption above stays honest — a test
 * that ever does exercise Mistral fails loudly here instead of silently
 * passing against a hollow double.
 */
class ChatMistralAI {
  constructor() {
    throw new Error(
      'ChatMistralAI is stubbed under Jest (api/test/__mocks__/langchainMistralAI.js) because ' +
        '@mistralai/mistralai ships ESM-only and cannot load in the CJS test runtime. If a ' +
        'test genuinely needs Mistral, run it outside Jest or give this stub a real implementation.',
    );
  }
}

module.exports = { ChatMistralAI };
