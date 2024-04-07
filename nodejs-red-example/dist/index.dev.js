"use strict";

var express = require('express');

var promClient = require('prom-client');

var app = express();
/**
 * 레이블 설정
 * k8s 환경이라면 deployement의 spec.template.metadata.labels예서 설정 가능
 */

var serverGroup = 'nodejs-exmaple-app';
promClient.register.setDefaultLabels({
  serverGroup: serverGroup,
  zone: process.env.ZONE || 'dev',
  // prod|cp-dev|dev|qa
  gameCode: 'log의 gameCode와 같은 값',
  // 개발사 필수
  priority: 'high' // high|medium. 이 어플리케이션의 중요도로 이상감지 알람에 사용

}); // CPU usage, memory usage 등의 기본 메트릭을 수집

promClient.collectDefaultMetrics(); // 커스텀 메트릭 "생성"

var registerRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
}); // RED 메트릭 측정용 커스텀 메트릭 "생성"
// metricName, labelNames 및 buckets를 아래와 같이 설정해야 사전정의 대시보드에서 정상적으로 노출됨

var registerRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in microseconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0, 25.0]
}); // Prometheus가 스크랩할 수 있도록 메트릭 노출

app.get('/metrics', function _callee(req, res) {
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          res.set('Content-Type', promClient.register.contentType);
          _context.t0 = res;
          _context.next = 4;
          return regeneratorRuntime.awrap(promClient.register.metrics());

        case 4:
          _context.t1 = _context.sent;

          _context.t0.send.call(_context.t0, _context.t1);

        case 6:
        case "end":
          return _context.stop();
      }
    }
  });
});
app.get('/foo/:id', function (req, res) {
  // 커스텀 메트릭 "수집"
  var endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  setTimeout(function () {
    res.send('foo response\n'); // 커스텀 메트릭 "수집"

    endTimer({
      status_code: res.statusCode
    });
    registerRequestCounter.labels({
      method: req.method,
      path: req.route.path,
      status_code: res.statusCode
    }).inc();
  }, 500);
});
app["delete"]('/foo/:id', function (req, res) {
  var endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  setTimeout(function () {
    res.send('foo deleted\n');
    endTimer({
      status_code: res.statusCode
    });
    registerRequestCounter.labels({
      method: req.method,
      path: req.route.path,
      status_code: res.statusCode
    }).inc();
  }, 300);
});
app.get('/bar', function (req, res) {
  var endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  res.send('bar response\n');
  endTimer({
    status_code: res.statusCode
  });
  registerRequestCounter.labels({
    method: req.method,
    path: req.route.path,
    status_code: res.statusCode
  }).inc();
});
app.get('/prometheus', function (req, res) {
  var endTimer = registerRequestDurationSeconds.startTimer({
    method: req.method,
    path: req.route.path
  });
  res.status(500).end('error\n');
  endTimer({
    status_code: res.statusCode
  });
});
app.listen(8000, function () {
  return console.info("listening on 8000\ntest in shell console:\n\ncurl localhost:8000/foo/1234\ncurl localhost:8000/foo/09.08.2018\ncurl -X DELETE localhost:8000/foo/5432\ncurl localhost:8000/bar\ncurl localhost:8000/prometheus\n");
});