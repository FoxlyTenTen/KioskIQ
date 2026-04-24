/**
 * CopilotKit API Route (Simplified Fast Version)
 *
 * Direct connection to Master Agents (No Middleware)
 */

import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Agent URLs
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || "http://localhost:9000";
  const locationMasterUrl = process.env.LOCATION_ORCHESTRATOR_URL || "http://localhost:9100";

  // Financial Master Agent
  const a2aChatAgent = new HttpAgent({
    url: orchestratorUrl,
  });

  // Location Master Agent
  const locationExpertAgent = new HttpAgent({
    url: locationMasterUrl,
  });

  // Create CopilotKit Runtime
  const runtime = new CopilotRuntime({
    agents: {
      a2a_chat: a2aChatAgent, 
      location_expert: locationExpertAgent,
    },
  });

  // Set up Next.js endpoint handler
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(request);
}
