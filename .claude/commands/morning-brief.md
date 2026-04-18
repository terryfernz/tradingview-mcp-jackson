# Morning Brief

Run the full daily session analysis workflow and produce an Apple-style HTML dashboard saved to iCloud.

## Workflow Steps

Execute ALL of the following steps in sequence:

### 1. Run Morning Brief + Chart State (parallel)
- Call `mcp__tradingview__morning_brief` — scans the watchlist from `rules.json`, reads all LuxAlgo indicator values (Signals & Overlays, Price Action Concepts, Oscillator Matrix, Order Blocks), and returns structured bias data
- Call `mcp__tradingview__chart_get_state` — get current chart symbol, timeframe, and all indicator entity IDs

### 2. Fetch News for All Symbols (parallel)
- Call `mcp__tradingview__tv_get_news` for every symbol returned by the morning brief (limit: 5 per symbol)
- Run all news fetches simultaneously in parallel

### 3. Get Price Action Data (parallel)
- Call `mcp__tradingview__data_get_pine_labels` with `study_filter: "LuxAlgo"`, `max_labels: 30` — gets CHoCH, BOS, and structure signals
- Call `mcp__tradingview__data_get_pine_lines` with `study_filter: "LuxAlgo"` — gets Order Block levels and key price lines

### 4. Analyse All Data
Apply the bias criteria from `rules.json` to each symbol. For each symbol produce:

**Session Bias** (Bullish / Bearish / Neutral / Avoid / Skip):
- LuxAlgo Signals & Overlays: Bar Color, Trend Strength, Smart Trail vs price
- LuxAlgo Price Action Concepts: PAC zone (Discount / Equilibrium / Premium), CHoCH/BOS signals
- LuxAlgo Oscillator Matrix: HyperWave (flag >80 as extended, >95 as near-max), Money Flow vs upper/lower thresholds (flag Bullish Overflow), Confluence Meter
- EMA: price position relative to 4H EMA
- News: positive / negative / neutral catalyst
- Price action candle: candle type (demand, doji, shooting star, bearish), % change, HOD/LOD relationship, volume context

**Options Analysis** (from `rules.json` Options setting):
- Bullish bias → evaluate CSP suitability: strike (0.25 delta, 10%+ OTM), estimated premium, capital required, IV context
- Bearish bias → evaluate Covered Call suitability: strike (above resistance/Smart Trail), premium estimate
- Note IV Rank context: ideal to sell premium at IV Rank >50%; flag when IV is near 52-week highs (good) or lows (poor)
- Flag any IV crush risk (post-earnings / news events)
- Identify the best wheel strategy candidate: highest trend strength + manageable capital + bullish bias + elevated IV

### 5. Build Apple-Style HTML Dashboard
Create a single-file HTML dashboard following the `rules.json` UI/UX setting. Include:

**Hero section:**
- Date, timeframe, overall market read (1–2 sentences), top 3 setup picks as chips

**Per-symbol cards** (one card per symbol, ordered: best setup first):
- Ticker + price + % change badge
- Bias badge (green=Bullish, red=Bearish/Avoid, amber=Caution, gray=Skip)
- Top accent bar colour matching bias
- **Price Action block**: OHLC, volume, candle type, written interpretation
- **Money Flow block**: Money Flow bar (vs upper/lower thresholds), Confluence bar, status chip (Bullish Overflow / Above threshold / Neutral / Fading / Below), written interpretation
- **HyperWave bar**: 0–100 progress bar, green <60, amber 60–80, red >80, alert chip if >80
- LuxAlgo metrics chips: EMA, Smart Trail, Trend Strength, PAC zone levels
- News snippet
- Key levels (support / resistance / watch) with colour coding

**Options Analysis section:**
- Per-symbol card with: IV data row (IV 30d, IV Rank, expected move or capital required), CSP analysis block, CC analysis block, strategy chips (strike, DTE, delta, est. premium)
- Verdict badges: CSP Viable / CC Preferred / Both Viable / Avoid / CC Only
- **Wheel Strategy deep dive** for the top candidate: 3-phase cycle diagram (Sell CSP → If Assigned → Sell CC), return projections grid (premium per contract, monthly %, annualised %), risk items with colour-coded dots

**Risk Rules section** (from `rules.json`):
- 4-rule panel with numbered badges

**Design spec:**
- Fonts: DM Sans + DM Mono (Google Fonts)
- Palette: `#F5F5F7` bg, `#ffffff` surface, `#1D1D1F` text, `#30D158` green, `#FF453A` red, `#FF9F0A` amber, `#0A84FF` blue
- Dark mode: auto-detect system preference + toggle button
- Sticky header with timeframe badge
- Card hover: `translateY(-3px)` + shadow lift
- Staggered `fadeUp` animations on load
- Fully responsive (single column on mobile)

### 6. Save the File
- Save as `/tmp/morning-brief.html`
- Copy to iCloud: `~/Library/Mobile Documents/com~apple~CloudDocs/trading sheets/morning_brief_YYYYMMDD.html` (use today's date)
- Open the file in the browser with `open /tmp/morning-brief.html`
- Confirm save location to the user

## Output Format
After completing all steps, deliver:
1. The formatted morning brief analysis (bias per symbol, key levels, options verdict)
2. Confirmation the HTML file was saved to iCloud with the full path
3. Any high-priority alerts (e.g. IV crush risk, HyperWave >95, shooting star at exit signal)

## Notes
- Always run news fetches in parallel to save time
- Use `summary: true` on any `data_get_ohlcv` calls to keep context lean
- The `rules.json` file at the project root is the source of truth for watchlist, bias criteria, risk rules, and preferences — always read it fresh each run
- If TradingView is not running, call `mcp__tradingview__tv_launch` first then `mcp__tradingview__tv_health_check`