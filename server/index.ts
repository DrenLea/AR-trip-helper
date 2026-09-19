import { createApp } from './routes';
import { createMemoryStore } from './store';
const port=Number(process.env.PORT??8787); createApp(createMemoryStore()).listen(port,()=>console.log(`sync API listening on ${port}`));
