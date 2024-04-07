const express = require('express');
const promBundle = require('express-prom-bundle');

const app = express();

function normalizePath(req) {
  return req.route.path;
}

// 모든 엔드포인트에서 RED 메트릭 측정
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {}
  },
  normalizePath
});

const { promClient } = metricsMiddleware;

const name = 'nodejs-red-example';
promClient.register.setDefaultLabels({
  name,
  zone: process.env.ZONE || 'dev'
});

// 커스텀 메트릭 생성
const registerRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
});

// 커스텀 메트릭 등록
promClient.register.registerMetric(registerRequestCounter);

// metricsMiddleware 등록
app.use(metricsMiddleware);
// app.use(/* your other middleware */);

app.get('/foo/:id', (req, res) => {
  setTimeout(() => {
    res.send('foo response\n');
    // 커스텀 메트릭 수집
    registerRequestCounter
      .labels({
        method: req.method,
        path: req.route.path,
        status_code: res.statusCode
      })
      .inc();
  }, getRandomInt(100, 3000));
});

app.delete('/foo/:id', (req, res) => {
  setTimeout(() => {
    res.send('foo deleted\n');
    registerRequestCounter
      .labels({
        method: req.method,
        path: req.route.path,
        status_code: res.statusCode
      })
      .inc();
  }, getRandomInt(100, 3000));
});

app.get('/bar', (req, res) => {
  setTimeout(() => {
    res.send('bar response\n');
    registerRequestCounter
      .labels({
        method: req.method,
        path: req.route.path,
        status_code: res.statusCode
      })
      .inc();
  }, getRandomInt(100, 10000));
});

app.get('/prometheus', (req, res) => {
  res.status(500).end('error\n');

  registerRequestCounter
    .labels({
      method: req.method,
      path: req.route.path,
      status_code: res.statusCode
    })
    .inc();
});

app.listen(8000, () => console.info('listening on 8000'));

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
