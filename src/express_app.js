import express from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from 'copilot-instructions-mcp/core';
import { reqInfo } from 'copilot-instructions-mcp/middlewares';
import mcpServer from './mcp_server.js';

const app = express();

app.disable('x-powered-by');

app.use(express.json({
  limit: '1mb',
  type: ['application/json', 'application/*+json'],
}));

app.use(reqInfo);

const mcpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (req, res) => {
  logger.info('Received request for homepage', {
    source: 'express_app.get(/)',
    reqInfo: req.info,
  });
  // TODO: Read in frontend homepage
  const homeHTML = '<html><head><title>Robotti MCP</title></head><body><h1>Welcome to Robotti MCP</h1></body></html>';
  return res.status(200).send(homeHTML);
});

app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/mcp', mcpRateLimit, (req, res) => {
  // TODO: Log request details
  /** TODO: Implement MCP Server GET Specification
      Specification 1: The client MAY issue an HTTP GET to the MCP endpoint. This can be used to open an SSE stream, allowing the server to communicate to the client, without the client first sending data via HTTP POST.
      Specification 2: The client MUST include an Accept header, listing text/event-stream as a supported content type.
      Specification 3: The server MUST either return Content-Type: text/event-stream in response to this HTTP GET, or else return HTTP 405 Method Not Allowed, indicating that the server does not offer an SSE stream at this endpoint.
      Specification 4: If the server initiates an SSE stream:
      - The server MAY send JSON-RPC requests and notifications on the stream.
      - These messages SHOULD be unrelated to any concurrently-running JSON-RPC request from the client.
      - The server MUST NOT send a JSON-RPC response on the stream unless resuming a stream associated with a previous client request.
      - The server MAY close the SSE stream at any time.
      - The client MAY close the SSE stream at any time.
  */
  logger.info('Received MCP GET request', {
    source: 'express_app.get(/mcp)',
    reqInfo: req.info,
  });
  return res.status(405).send('Method Not Allowed');
});

app.post('/mcp', mcpRateLimit, async (req, res) => {
  logger.info('Received MCP POST request', {
    source: 'express_app.post(/mcp)',
    reqInfo: req.info,
  });

  try {
    const mcp = mcpServer();
    await mcp.server.connect(mcp.transport);
    return await mcp.transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('Unhandled error while processing MCP POST request', {
      source: 'express_app.post(/mcp)',
      reqInfo: req.info,
      error: {
        message: error?.message || String(error),
        stack: error?.stack,
      },
    });

    if (!res.headersSent) {
      return res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
        },
        id: null,
      });
    }
  }
  return res.status(500).end();
});

// Ensure JSON parse errors are returned consistently (and do not leak stacks)
// This runs after route handlers when express.json() throws.
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    logger.warn('Invalid JSON body received', {
      source: 'express_app.jsonParser',
      reqInfo: req.info,
    });

    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
      id: null,
    });
  }

  return next(err);
});

export default app;
