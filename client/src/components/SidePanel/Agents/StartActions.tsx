import React, { useCallback } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Constants } from 'librechat-data-provider';
import type { AgentForm } from '~/common';
import { useAgentPanelContext } from '~/Providers';

type StartAction = { server: string; tool: string; args?: Record<string, unknown> };

export default function StartActions({ mcpServerNames }: { mcpServerNames?: string[] }) {
  const { mcpServersMap } = useAgentPanelContext();
  const { control, setValue, getValues } = useFormContext<AgentForm>();
  const startActions = useWatch({ control, name: 'start_actions' }) ?? [];

  const isActive = useCallback(
    (server: string, tool: string) =>
      startActions.some((a: StartAction) => a.server === server && a.tool === tool),
    [startActions],
  );

  const toggle = useCallback(
    (server: string, tool: string) => {
      const current: StartAction[] = getValues('start_actions') ?? [];
      const exists = current.some((a) => a.server === server && a.tool === tool);
      const next = exists
        ? current.filter((a) => !(a.server === server && a.tool === tool))
        : [...current, { server, tool }];
      setValue('start_actions', next, { shouldDirty: true });
    },
    [getValues, setValue],
  );

  if (!mcpServerNames?.length) {
    return null;
  }

  const serversWithTools = mcpServerNames
    .map((name) => {
      const info = mcpServersMap.get(name);
      if (!info?.tools?.length) {
        return null;
      }
      return { serverName: name, tools: info.tools };
    })
    .filter(Boolean) as Array<{ serverName: string; tools: Array<{ tool_id: string; metadata: { name: string; description?: string } }> }>;

  if (!serversWithTools.length) {
    return null;
  }

  return (
    <div className="mb-4">
      <label className="text-token-text-primary mb-2 block font-medium">Start Actions</label>
      <p className="mb-2 text-xs text-text-secondary">
        Selected tools run automatically before every response, injecting ambient context.
      </p>
      <div className="space-y-2">
        {serversWithTools.map(({ serverName, tools }) => (
          <div key={serverName} className="rounded-lg border border-border-light p-2">
            <div className="mb-1 text-xs font-medium text-text-secondary">{serverName}</div>
            {tools.map(({ tool_id, metadata }) => {
              const toolName = tool_id.split(Constants.mcp_delimiter)[0];
              const active = isActive(serverName, toolName);
              return (
                <label
                  key={tool_id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-surface-tertiary"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(serverName, toolName)}
                    className="h-4 w-4 rounded border-border-medium accent-text-primary"
                  />
                  <span className="text-sm">{metadata.name ?? toolName}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
