import { createApp } from './app.js';
import { config } from './config.js';

const app = await createApp();

app.listen(config.apiPort, () => {
  // eslint-disable-next-line no-console
  console.log(`Sunave API listening on port ${config.apiPort}`);
});
