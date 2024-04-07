const express = require('express');
const promClient = require('prom-client');

const app = express();

const name = 'nodejs-red-example';
promClient.register.setDefaultLabels({
  name,
  zone: process.env.ZONE || 'dev'
});

// CPU usage, memory usage 등의 기본 메트릭 수집
promClient.collectDefaultMetrics();

// 커스텀 메트릭 생성
const registerRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
});

// RED 메트릭 측정 커스텀 메트릭 생성
const registerRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 10]
});

// Prometheus 스크랩 endpoint 노출
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.send(await promClient.register.metrics());
});

app.get('/foo/:id', (req, res) => {
  // 커스텀 메트릭 수집
  const endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  setTimeout(() => {
    res.send('foo response\n');
    endTimer({ status_code: res.statusCode });

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
  const endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  setTimeout(() => {
    res.send('foo deleted\n');
    endTimer({ status_code: res.statusCode });

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
    const endTimer = registerRequestDurationSeconds.startTimer({
      method: req.method,
      path: req.route.path
    });
    res.send('bar response\n');
    endTimer({ status_code: res.statusCode });

    registerRequestCounter
      .labels({
        method: req.method,
        path: req.route.path,
        status_code: res.statusCode
      })
      .inc();
  }, getRandomInt(100, 10000));

  app.get('/prometheus', (req, res) => {
    const endTimer = registerRequestDurationSeconds.startTimer({
      method: req.method,
      path: req.route.path
    });
    res.status(500).end('error\n');

    endTimer({ status_code: res.statusCode });

    registerRequestCounter
      .labels({
        method: req.method,
        path: req.route.path,
        status_code: res.statusCode
      })
      .inc();
  });
});

app.listen(8000, () => console.info('listening on 8000'));

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
