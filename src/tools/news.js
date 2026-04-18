import { z } from 'zod';
import { jsonResult } from './_format.js';
import * as core from '../core/news.js';

export function registerNewsTools(server) {
  server.tool(
    'tv_get_news',
    'Fetch the latest news headlines from TradingView for a symbol. Returns titles, timestamps, sources, and links. Use this to factor in recent news flow during analysis.',
    {
      symbol: z.string().describe('Symbol to fetch news for (e.g. "NASDAQ:AAPL", "HIMS", "BTCUSD"). Blank = current chart symbol.').optional(),
      limit:  z.coerce.number().optional().describe('Max headlines to return (default 10, max 50)'),
    },
    async ({ symbol, limit }) => {
      try {
        // Fall back to current chart symbol if none provided
        if (!symbol) {
          const { evaluate } = await import('../connection.js');
          const chartSym = await evaluate(`
            (function() {
              try { return window.TradingViewApi._activeChartWidgetWV.value().symbol(); } catch(e) {}
              try { return document.title.match(/([A-Z0-9:!.]+)\\s*[·\\-]/)?.[1] || null; } catch(e) {}
              return null;
            })()
          `);
          symbol = chartSym || 'UNKNOWN';
        }
        return jsonResult(await core.getNews({ symbol, limit: Math.min(limit ?? 10, 50) }));
      } catch (err) {
        return jsonResult({ success: false, error: err.message }, true);
      }
    },
  );
}