/**
 * Core news logic.
 * Fetches news headlines from TradingView's news API using the page's session context.
 * Runs fetch() inside the CDP page so auth cookies are included automatically.
 */
import { evaluateAsync, evaluate } from '../connection.js';

export async function getNews({ symbol, limit = 10 }) {
  // Normalise symbol — strip exchange prefix for the topic param (NASDAQ:AAPL → AAPL)
  const topicSym = symbol.includes(':') ? symbol.split(':')[1] : symbol;
  const fullSym  = symbol;

  const data = await evaluateAsync(`
    (async function() {
      const topic   = ${JSON.stringify(topicSym)};
      const fullSym = ${JSON.stringify(fullSym)};
      const lim     = ${limit};

      function parseItems(items) {
        return items.slice(0, lim).map(function(item) {
          var ts = item.published || item.publishedAt || item.published_at || null;
          var publishedIso = ts ? new Date(ts * 1000).toISOString() : null;
          var link = item.link || item.url || null;
          if (link && link.startsWith('/')) link = 'https://www.tradingview.com' + link;
          return {
            title:     item.title     || null,
            published: publishedIso,
            source:    item.source    || item.provider || null,
            urgency:   item.urgency   || null,
            url:       link,
          };
        });
      }

      // Strategy 1: symbol-specific news endpoint
      try {
        var url1 = 'https://news-headlines.tradingview.com/v2/view/headlines/symbol'
          + '?client=web&lang=en&section=&topic=' + encodeURIComponent(topic)
          + '&symbol=' + encodeURIComponent(fullSym);
        var r1 = await fetch(url1, { credentials: 'include' });
        if (r1.ok) {
          var j1 = await r1.json();
          var items1 = j1.items || j1.data || j1.results || j1 || [];
          if (Array.isArray(items1) && items1.length > 0) {
            return { success: true, symbol: fullSym, source: 'tv_headlines_api', count: Math.min(items1.length, lim), news: parseItems(items1) };
          }
        }
      } catch(e1) {}

      // Strategy 2: broader topic search without exchange prefix
      try {
        var url2 = 'https://news-headlines.tradingview.com/v2/view/headlines/topic'
          + '?client=web&lang=en&section=&topic=' + encodeURIComponent(topic);
        var r2 = await fetch(url2, { credentials: 'include' });
        if (r2.ok) {
          var j2 = await r2.json();
          var items2 = j2.items || j2.data || j2.results || j2 || [];
          if (Array.isArray(items2) && items2.length > 0) {
            return { success: true, symbol: fullSym, source: 'tv_topic_api', count: Math.min(items2.length, lim), news: parseItems(items2) };
          }
        }
      } catch(e2) {}

      // Strategy 3: DOM scraping — reads the news panel if it is open in TradingView
      try {
        var panels = [
          document.querySelector('[data-name="news"]'),
          document.querySelector('[class*="news-widget"]'),
          document.querySelector('[class*="newsPanel"]'),
          document.querySelector('[class*="News"]'),
        ].filter(Boolean);

        var panel = panels[0];
        if (panel) {
          var rows = panel.querySelectorAll('article, [class*="news-item"], [class*="newsItem"], [class*="headline"]');
          if (rows.length > 0) {
            var domNews = [];
            for (var i = 0; i < Math.min(rows.length, lim); i++) {
              var row = rows[i];
              var titleEl  = row.querySelector('[class*="title"], [class*="headline"], h1, h2, h3, h4');
              var timeEl   = row.querySelector('[class*="time"], [class*="date"], time');
              var srcEl    = row.querySelector('[class*="source"], [class*="provider"], [class*="author"]');
              var linkEl   = row.querySelector('a[href]');
              domNews.push({
                title:     titleEl ? titleEl.textContent.trim() : null,
                published: timeEl  ? timeEl.getAttribute('datetime') || timeEl.textContent.trim() : null,
                source:    srcEl   ? srcEl.textContent.trim() : null,
                urgency:   null,
                url:       linkEl  ? linkEl.href : null,
              });
            }
            if (domNews.length > 0) {
              return { success: true, symbol: fullSym, source: 'dom_panel', count: domNews.length, news: domNews };
            }
          }
        }
      } catch(e3) {}

      return {
        success: false,
        symbol: fullSym,
        error: 'Could not fetch news — API unavailable and news panel not open. Try opening the News panel in TradingView.',
      };
    })()
  `);

  return data;
}