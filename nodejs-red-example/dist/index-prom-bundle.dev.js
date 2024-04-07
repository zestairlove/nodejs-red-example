"use strict";

var express = require('express');

var promBundle = require('express-prom-bundle');

var app = express();
/**
 * express-prom-bundle을 사용할 때는 normalizePath를 사용하여 path를 정규화해야 합니다.
 * 아래 함수를 promBundle 옵션에 추가하여 아래와 같이 간단히 정규화할 수 있습니다.
 * FROM:
 * - path="/foo/09.08.2018"
 * - path="/foo/1234curl"
 * TO:
 * - path="/foo/:id"
 */

function normalizePath(req) {
  return req.route.path;
} // 모든 엔드포인트에 RED 메트릭 측정용 http_request_duration_seconds 메트릭 수집을 위한 미들웨어 생성
// CPU usage, memory usage 등의 기본 메트릭을 수집 설정 포함


var metricsMiddleware = promBundle({
  buckets: [0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0, 25.0],
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {}
  },
  normalizePath: normalizePath
});
var promClient = metricsMiddleware.promClient;
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

}); // 커스텀 메트릭 "생성"

var registerRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code']
}); // 커스텀 메트릭 "등록"

promClient.register.registerMetric(registerRequestCounter); // metricsMiddleware 등록

app.use(metricsMiddleware); // app.use(/* your middleware */);
// 메크릭 게시을 위한 엔드포인트 필요없음, promBundle 라이브러리가 자동으로 /metrics 엔드포인트를 생성
// app.get('/metrics', async (req, res) => {
//   res.set('Content-Type', register.contentType);
//   res.send(await register.metrics());
// });

app.get('/foo/:id', function (req, res) {
  setTimeout(function () {
    res.send('foo response\n'); // 커스텀 메트릭 "수집"

    registerRequestCounter.labels({
      method: req.method,
      path: req.route.path,
      status_code: res.statusCode
    }).inc();
  }, 500);
});
app["delete"]('/foo/:id', function (req, res) {
  setTimeout(function () {
    res.send('foo deleted\n');
    registerRequestCounter.labels({
      method: req.method,
      path: req.route.path,
      status_code: res.statusCode
    }).inc();
  }, 300);
});
app.get('/bar', function (req, res) {
  res.send('bar response\n');
  registerRequestCounter.labels({
    method: req.method,
    path: req.route.path,
    status_code: res.statusCode
  }).inc();
});
app.get('/prometheus', function (req, res) {
  res.status(500).end('error\n');
});
app.listen(8000, function () {
  return console.info("listening on 8000\ntest in shell console:\n\ncurl localhost:8000/foo/1234\ncurl localhost:8000/foo/09.08.2018\ncurl -X DELETE localhost:8000/foo/5432\ncurl localhost:8000/bar\ncurl localhost:8000/prometheus\n");
});