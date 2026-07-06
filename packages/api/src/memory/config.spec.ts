import { logger } from '@librechat/data-schemas';

import type { TCustomConfig } from 'librechat-data-provider';

import {
  isMemoryAgentEnabled,
  isMemoryEnabled,
  isMemoryExcludedEndpoint,
  loadMemoryConfig,
} from './config';

describe('memory config', () => {
  it('keeps memory enabled without configuring an automatic memory agent', () => {
    const config: TCustomConfig['memory'] = {
      personalize: true,
    };

    const loaded = loadMemoryConfig(config);

    expect(isMemoryEnabled(loaded)).toBe(true);
    expect(isMemoryAgentEnabled(loaded)).toBe(false);
  });

  it('requires explicit memory agent enablement before enabling the automatic agent flow', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    const config: TCustomConfig['memory'] = {
      agent: {
        id: 'memory-agent',
      },
    };

    const loaded = loadMemoryConfig(config);

    expect(isMemoryEnabled(loaded)).toBe(true);
    expect(isMemoryAgentEnabled(loaded)).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[memory] Agent config detected without explicit `enabled: true`. Automatic memory extraction is now opt-in. Add `memory.agent.enabled: true` to keep automatic memory updates.',
    );
  });

  it('does not enable the automatic memory agent flow when explicitly disabled', () => {
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    const config: TCustomConfig['memory'] = {
      agent: {
        enabled: false,
        id: 'memory-agent',
      },
    };

    const loaded = loadMemoryConfig(config);

    expect(isMemoryEnabled(loaded)).toBe(true);
    expect(isMemoryAgentEnabled(loaded)).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('enables the automatic memory agent flow when explicitly configured', () => {
    const config: TCustomConfig['memory'] = {
      agent: {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4o-mini',
      },
    };

    const loaded = loadMemoryConfig(config);

    expect(isMemoryEnabled(loaded)).toBe(true);
    expect(isMemoryAgentEnabled(loaded)).toBe(true);
  });

  it('keeps disabled memory disabled even when the agent is explicitly enabled', () => {
    const config: TCustomConfig['memory'] = {
      disabled: true,
      agent: {
        enabled: true,
        id: 'memory-agent',
      },
    };

    const loaded = loadMemoryConfig(config);

    expect(isMemoryEnabled(loaded)).toBe(false);
    expect(isMemoryAgentEnabled(loaded)).toBe(false);
  });

  describe('isMemoryExcludedEndpoint', () => {
    const config: TCustomConfig['memory'] = {
      personalize: true,
      excludedEndpoints: ['GCP LLM Eval', 'GCP LLM Eval MS4'],
    };

    it('excludes listed endpoints case-insensitively', () => {
      const loaded = loadMemoryConfig(config);
      expect(isMemoryExcludedEndpoint(loaded, 'GCP LLM Eval')).toBe(true);
      expect(isMemoryExcludedEndpoint(loaded, 'gcp llm eval ms4')).toBe(true);
    });

    it('does not exclude unlisted endpoints', () => {
      const loaded = loadMemoryConfig(config);
      expect(isMemoryExcludedEndpoint(loaded, 'anthropic')).toBe(false);
      expect(isMemoryExcludedEndpoint(loaded, 'agents')).toBe(false);
    });

    it('is a no-op without config, endpoint, or exclusion list', () => {
      expect(isMemoryExcludedEndpoint(undefined, 'GCP LLM Eval')).toBe(false);
      expect(isMemoryExcludedEndpoint(loadMemoryConfig(config), undefined)).toBe(false);
      expect(isMemoryExcludedEndpoint(loadMemoryConfig({ personalize: true }), 'GCP LLM Eval')).toBe(
        false,
      );
    });
  });
});
