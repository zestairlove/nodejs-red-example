async function* fetchRandomRouteByInterval(ms = 1000) {
  for (let cnt of loop()) {
    console.log('cnt', cnt);
    const response = await Promise.all([fetchRandomRoute(), wait(ms)]);
    yield response[0];
  }
}

(async () => {
  for await (let res of fetchRandomRouteByInterval()) {
    console.log(await res.text());
  }
})();

function fetchRandomRoute() {
  const routes = [
    'http://localhost:8000/foo/1234',
    'http://localhost:8000/foo/09.08.2018',
    'http://localhost:8000/foo/5432',
    'http://localhost:8000/bar',
    'http://localhost:8000/prometheus'
  ];

  const randomRoute = routes[Math.floor(Math.random() * routes.length)];
  console.log('fetching', randomRoute);

  return fetch(randomRoute);
}

function fetchData(url) {
  return fetch(url)
    .then(res => res.json())
    .catch(err => console.error(err));
}

function wait(ms) {
  return new Promise(res => setTimeout(res, ms, ms));
}

function* loop() {
  let count = 0;

  while (true) {
    yield count++;
  }
}
