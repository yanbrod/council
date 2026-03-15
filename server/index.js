const express = require('express');
const path = require('path');
const config = require('./config');
const sessionsRouter = require('./routes/sessions');
const councilRouter = require('./routes/council');

const app = express();

app.use(express.json());

app.get('/api/providers', (_req, res) => {
  const providers = Object.entries(config.PROVIDERS).map(([name, cfg]) => ({
    name,
    label: cfg.label || name,
  }));
  res.json(providers);
});

app.use('/api/sessions', sessionsRouter);
app.use('/api/council', councilRouter);

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(config.PORT, () => {
  console.log(`AI Council server running on http://localhost:${config.PORT}`);
});
