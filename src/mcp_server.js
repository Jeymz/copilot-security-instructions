import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import mcpTools from 'copilot-instructions-mcp/mcp_tools';
import { prompts } from 'copilot-instructions-mcp/mcp_prompts';

function makeMCPServer() {
  const server = new McpServer({
    name: 'copilot-security-mcp',
    version: '1.0.0',
    title: 'Copilot Security Instructions MCP',

  });

  // Register Tools
  mcpTools.list_resources(server);
  mcpTools.list_prompts(server);
  mcpTools.get_prompt(server);

  // Register MCP-native prompts for client compatibility (prompts/list + prompts/get)
  for (const [promptName, promptText] of Object.entries(prompts)) {
    server.registerPrompt(
      promptName,
      {
        title: promptName,
        description: `Prompt loaded from prompts/${promptName}`,
      },
      async () => ({
        description: `Prompt loaded from prompts/${promptName}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      }),
    );
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  return { server, transport };
}

export default makeMCPServer;
