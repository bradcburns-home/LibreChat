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

/** True when `endpoint` is listed in `memory.excludedEndpoints` — such
 * conversations get no memory injection and no memory-agent processing.
 * Matching is case-insensitive on the endpoint name as stored on the
 * conversation (custom endpoint display name, or e.g. 'anthropic'). */
export function isMemoryExcludedEndpoint(
  config: TMemoryConfig | undefined,
  endpoint?: string | null,
): boolean {
  if (!config || !endpoint) return false;
  const excluded = config.excludedEndpoints;
  if (!excluded || excluded.length === 0) return false;
  const needle = endpoint.toLowerCase();
  return excluded.some((e) => typeof e === 'string' && e.toLowerCase() === needle);
}

export function isMemoryAgentEnabled(config: TMemoryConfig | undefined): boolean {
  if (!isMemoryEnabled(config)) return false;
  return config?.agent?.enabled === true && hasValidAgent(config.agent);
}
