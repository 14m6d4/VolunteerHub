import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import client from 'prom-client';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Incoming IDs are echoed into a response header and every log line, so only
// a short, plain token is trusted; anything else gets a fresh UUID.
const SAFE_ID = /^[\w.-]{1,128}$/;

export const requestLogger = pinoHttp({
    logger,
    // The default serializers dump every header, Authorization included, into
    // the logs. Keep only what is needed to follow a request; the query string
    // is dropped too (OAuth codes, tokens).
    serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
        res: (res) => ({ statusCode: res.statusCode }),
    },
    genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
    },
});

client.collectDefaultMetrics();

const labelNames = ['method', 'route', 'status_class'] as const;
const httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by method, route template and status class',
    labelNames,
});
const httpDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request latency by method, route template and status class',
    labelNames,
});

export function httpMetrics(req: Request, res: Response, next: NextFunction) {
    const end = httpDuration.startTimer();
    // Express resets req.baseUrl once the router unwinds, so by "finish" the
    // mount prefix is gone. Capture it at the moment the route is matched.
    // Raw paths would blow up label cardinality (ids, scanners), so a request
    // that matched no route is one "unmatched" series.
    let route = 'unmatched';
    let matched: { path: string } | undefined;
    Object.defineProperty(req, 'route', {
        configurable: true,
        get: () => matched,
        set: (value?: { path: string }) => {
            matched = value;
            if (value) route = `${req.baseUrl}${value.path}`;
        },
    });
    res.on('finish', () => {
        const labels = { method: req.method, route, status_class: `${Math.floor(res.statusCode / 100)}xx` };
        httpRequests.inc(labels);
        end(labels);
    });
    next();
}

// Served by the app on its container port but never routed by Traefik. A
// forwarded request is refused too, so a misconfigured router can't expose it.
export async function metricsHandler(req: Request, res: Response) {
    if (req.headers['x-forwarded-for']) {
        res.status(404).json({ status: 'fail', message: 'Not Found' });
        return;
    }
    res.set('Content-Type', client.register.contentType).send(await client.register.metrics());
}
