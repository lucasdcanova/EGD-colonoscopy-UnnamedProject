#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import tools
import { validateEndoscopyImageTool } from "./tools/imageValidation.js";
import { checkComplianceTool } from "./tools/complianceCheck.js";
import { anonymizeDataTool } from "./tools/dataAnonymization.js";
import { validateConfigTool } from "./tools/configValidation.js";

// Import resources
import { medgemmaConfigResource } from "./resources/medgemmaConfig.js";
import { projectGuidelinesResource } from "./resources/projectGuidelines.js";
import { infrastructureConfigResource } from "./resources/infrastructureConfig.js";

// Initialize server
const server = new Server(
  {
    name: "egd-colonoscopy-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool definitions
const tools = [
  validateEndoscopyImageTool,
  checkComplianceTool,
  anonymizeDataTool,
  validateConfigTool,
];

// Resource definitions
const resources = [
  medgemmaConfigResource,
  projectGuidelinesResource,
  infrastructureConfigResource,
];

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: resources.map((resource) => ({
    uri: resource.uri,
    name: resource.name,
    description: resource.description,
    mimeType: resource.mimeType,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  
  try {
    // Type assertion since we know each tool expects specific args
    const result = await (tool.handler as any)(args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  const resource = resources.find((r) => r.uri === uri);
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  const content = await resource.handler();
  return {
    contents: [
      {
        uri,
        mimeType: resource.mimeType,
        text: typeof content === "string" ? content : JSON.stringify(content, null, 2),
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("EGD/Colonoscopy MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});