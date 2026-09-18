import { memorySchema } from 'librechat-data-provider';

import type { TCustomConfig, TMemoryConfig } from 'librechat-data-provider';

import logger from '~/config/winston';

const hasValidAgent = (agent: TMemoryConfig['agent']) =>
  !!agent &&
  (('id' in agent && !!agent.id) ||
    ('provider' in agent && 'model' in agent && !!agent.provider && !!agent.model));

const isDisabled = (config?: TMemoryConfig | TCustomConfig['memory']) =>
  !config || config.disabled === true;

export function loadMemoryConfig(config: TCustomConfig['memory']): TMemoryConfig | undefined {
  if (!config) return undefined;
  if (isDisabled(config)) return config as TMemoryConfig;

  if (hasValidAgent(config.agent) && config.agent?.enabled == null) {
    logger.warn(
      '[memory] Agent config detected without explicit `enabled: true`. Automatic memory extraction is now opt-in. Add `memory.agent.enabled: true` to keep automatic memory updates.',
    );
  }

  const charLimit = memorySchema.shape.charLimit.safeParse(config.charLimit).data ?? 10000;

  return { ...config, charLimit };
}

export function isMemoryEnabled(config: TMemoryConfig | undefined): boolean {
  return !isDisabled(config);
}

/** True when any candidate name is listed in `memory.excludedEndpoints`.
 * Conversations on those endpoints get no memory injection and no
 * memory-agent processing.
 *
 * Pass every name the conversation is known by. Saved agents store
 * `options.endpoint` as `'agents'` (so a single-name check against the
 * conversation endpoint silently misses them — Birmingham-Ops#445);
 * `agent.endpoint` is rewritten to the underlying provider during
 * `initializeAgent` (e.g. `'BB-AMG Ollama'`). Matching is
 * case-insensitive. Empty / missing candidates are ignored. */
export function isMemoryExcludedEndpoint(
  config: TMemoryConfig | undefined,
  ...candidates: Array<string | null | undefined>
): boolean {
  if (!config) return false;
  const excluded = config.excludedEndpoints;
  if (!excluded || excluded.length === 0) return false;
  const needles = excluded
    .filter((e): e is string => typeof e === 'string' && e.length > 0)
    .map((e) => e.toLowerCase());
  if (needles.length === 0) return false;
  return candidates.some(
    (c) => typeof c === 'string' && c.length > 0 && needles.includes(c.toLowerCase()),
  );
}

export function isMemoryAgentEnabled(config: TMemoryConfig | undefined): boolean {
  if (!isMemoryEnabled(config)) return false;
  return config?.agent?.enabled === true && hasValidAgent(config.agent);
}
