/**
 * Tier 2 integration: live librechat.yaml → real config loaders → AgentClient
 * privacy gate, with the Anthropic/memory-LLM boundary faked.
 *
 * Birmingham-Ops#445 — saved local-model agents persist `endpoint: agents`
 * while the Ollama provider lives on `agent.endpoint`. A broken exclusion
 * has no runtime error state, so this suite is load-bearing.
 *
 * Fakes (outermost third-party only): Mongo memory reads, the Anthropic
 * memory-agent constructor, and generateTitle's LLM HTTP call.
 * Lab-owned yaml parse, memory schema, loadMemoryConfig,
 * isMemoryExcludedEndpoint, and AgentClient#useMemory / #titleConvo are real.
 */
const fs = require('fs');
const yaml = require('js-yaml');
const { Providers } = require('@librechat/agents');
const { Constants, EModelEndpoint } = require('librechat-data-provider');
const {
  AppService,
  loadMemoryConfig,
  isMemoryExcludedEndpoint,
} = require('@librechat/data-schemas');

const LIVE_YAML = '/srv/librechat/librechat.yaml';

jest.mock('@librechat/agents', () => ({
  ...jest.requireActual('@librechat/agents'),
  createMetadataAggregator: () => ({
    handleLLMEnd: jest.fn(),
    collected: [],
  }),
}));

jest.mock('@librechat/api', () => ({
  ...jest.requireActual('@librechat/api'),
  checkAccess: jest.fn(),
  countFormattedMessageTokens: jest.fn(() => 42),
  countTokens: jest.fn((text) => Math.ceil(String(text ?? '').length / 4)),
  initializeAgent: jest.fn(),
  createMemoryProcessor: jest.fn(),
  createSafeUser: jest.fn((user) => ({ id: user?.id })),
  loadAgent: jest.fn(),
}));

jest.mock('~/server/services/Config', () => ({
  getMCPServerTools: jest.fn(),
}));

jest.mock('~/server/services/MCP', () => ({
  resolveConfigServers: jest.fn().mockResolvedValue({}),
}));

jest.mock('~/models', () => ({
  getAgent: jest.fn(),
  getRoleByName: jest.fn(),
  getFormattedMemories: jest.fn(),
}));

const AgentClient = require('../client');
const { checkAccess, initializeAgent, createMemoryProcessor, loadAgent } = require('@librechat/api');
const { getFormattedMemories } = require('~/models');

function isRfc1918Host(hostname) {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('10.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('169.254.')) return true;
  const m = host.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    return second >= 16 && second <= 31;
  }
  return false;
}

function loadLiveOverlay() {
  if (!fs.existsSync(LIVE_YAML)) {
    throw new Error(
      `Live LibreChat overlay missing at ${LIVE_YAML}. This suite is fail-closed — it will not skip.`,
    );
  }
  const raw = yaml.load(fs.readFileSync(LIVE_YAML, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Failed to parse ${LIVE_YAML} as YAML object`);
  }
  return raw;
}

describe('local-endpoint privacy gate (live yaml integration)', () => {
  let overlay;
  let appConfig;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

  beforeAll(async () => {
    overlay = loadLiveOverlay();
    appConfig = await AppService({
      config: {
        version: overlay.version,
        memory: overlay.memory,
        endpoints: overlay.endpoints,
      },
    });
  });

  afterAll(() => {
    if (originalAnthropicKey) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    checkAccess.mockResolvedValue(true);
    getFormattedMemories.mockResolvedValue({
      withKeys: 'should-never-inject',
      withoutKeys: 'should-never-inject',
      totalTokens: 3,
    });
    initializeAgent.mockResolvedValue({
      id: 'memory-agent',
      provider: EModelEndpoint.anthropic,
      model: 'claude-sonnet-4-6',
    });
    createMemoryProcessor.mockResolvedValue([undefined, jest.fn()]);
    loadAgent.mockResolvedValue(null);
  });

  function makeClient({ endpoint, agentEndpoint, agentProvider, model, extraEndpoints }) {
    const agent = {
      id: endpoint === EModelEndpoint.agents ? 'saved-local-agent' : Constants.EPHEMERAL_AGENT_ID,
      endpoint: agentEndpoint,
      provider: agentProvider ?? agentEndpoint,
      model,
      model_parameters: { model },
    };
    const client = new AgentClient({
      req: {
        user: { id: 'user-123', personalization: { memories: true } },
        body: { model, endpoint, key: null },
        config: {
          ...appConfig,
          endpoints: {
            ...appConfig.endpoints,
            ...extraEndpoints,
          },
        },
      },
      res: {},
      agent,
      endpoint,
    });
    client.run = {
      generateTitle: jest.fn().mockResolvedValue({ title: 'Generated Title' }),
    };
    client.responseMessageId = 'response-123';
    client.conversationId = 'convo-123';
    client.contentParts = [{ type: 'text', text: 'local chat content' }];
    client.recordCollectedUsage = jest.fn().mockResolvedValue();
    return client;
  }

  describe('live overlay contract', () => {
    it('parses memory.excludedEndpoints through the real loader', () => {
      const loaded = loadMemoryConfig(overlay.memory);
      expect(loaded).toBeDefined();
      expect(loaded.agent?.enabled).toBe(true);
      expect(loaded.agent?.provider).toBe('anthropic');
      expect(Array.isArray(loaded.excludedEndpoints)).toBe(true);
      expect(loaded.excludedEndpoints.length).toBeGreaterThan(0);
    });

    it('lists every RFC1918 custom endpoint in excludedEndpoints (Birmingham-Ops#445)', () => {
      const loaded = loadMemoryConfig(overlay.memory);
      const custom = overlay.endpoints?.custom ?? [];
      expect(custom.length).toBeGreaterThan(0);

      const privateEndpoints = custom.filter((ep) => {
        try {
          return isRfc1918Host(new URL(ep.baseURL).hostname);
        } catch {
          return false;
        }
      });
      expect(privateEndpoints.length).toBeGreaterThan(0);

      for (const ep of privateEndpoints) {
        expect(isMemoryExcludedEndpoint(loaded, ep.name)).toBe(true);
        expect(ep.titleEndpoint).toBeUndefined();
      }
    });

    it('keeps BB-AMG Ollama excluded even when the conversation endpoint is agents', () => {
      const loaded = loadMemoryConfig(overlay.memory);
      expect(isMemoryExcludedEndpoint(loaded, EModelEndpoint.agents, 'BB-AMG Ollama')).toBe(true);
      expect(isMemoryExcludedEndpoint(loaded, EModelEndpoint.agents, 'anthropic')).toBe(false);
    });
  });

  describe('AgentClient#useMemory against live overlay', () => {
    it('does not arm the Anthropic memory agent for a raw BB-AMG Ollama chat', async () => {
      const client = makeClient({
        endpoint: 'BB-AMG Ollama',
        agentEndpoint: 'BB-AMG Ollama',
        model: 'qwen3.6:35b-a3b',
      });

      const result = await client.useMemory();

      expect(result).toBeUndefined();
      expect(getFormattedMemories).not.toHaveBeenCalled();
      expect(initializeAgent).not.toHaveBeenCalled();
      expect(createMemoryProcessor).not.toHaveBeenCalled();
      expect(client.processMemory).toBeUndefined();
    });

    it('does not arm the Anthropic memory agent for a saved local-model agent', async () => {
      const client = makeClient({
        endpoint: EModelEndpoint.agents,
        agentEndpoint: 'BB-AMG Ollama',
        agentProvider: EModelEndpoint.openAI,
        model: 'qwen3.6:35b-a3b',
      });

      const result = await client.useMemory();

      expect(result).toBeUndefined();
      expect(getFormattedMemories).not.toHaveBeenCalled();
      expect(initializeAgent).not.toHaveBeenCalled();
      expect(createMemoryProcessor).not.toHaveBeenCalled();
      expect(client.processMemory).toBeUndefined();
    });

    it('still arms the memory agent for a frontier Anthropic agent', async () => {
      const client = makeClient({
        endpoint: EModelEndpoint.agents,
        agentEndpoint: EModelEndpoint.anthropic,
        agentProvider: EModelEndpoint.anthropic,
        model: 'claude-sonnet-4-6',
      });

      await client.useMemory();

      expect(initializeAgent).toHaveBeenCalled();
      expect(createMemoryProcessor).toHaveBeenCalled();
    });
  });

  describe('AgentClient#titleConvo against live overlay', () => {
    it('refuses endpoints.all titleEndpoint anthropic for a saved local-model agent', async () => {
      const client = makeClient({
        endpoint: EModelEndpoint.agents,
        agentEndpoint: 'BB-AMG Ollama',
        agentProvider: 'BB-AMG Ollama',
        model: 'qwen3.6:35b-a3b',
        extraEndpoints: {
          all: {
            titleConvo: true,
            titleModel: 'claude-haiku-4-5-20251001',
            titleMethod: 'completion',
            titleEndpoint: EModelEndpoint.anthropic,
          },
        },
      });

      await client.titleConvo({ text: 'local chat', abortController: new AbortController() });

      expect(client.run.generateTitle).toHaveBeenCalled();
      const call = client.run.generateTitle.mock.calls[0][0];
      expect(call.provider).not.toBe(Providers.ANTHROPIC);
      expect(call.clientOptions.model).not.toBe('claude-haiku-4-5-20251001');
    });
  });
});
