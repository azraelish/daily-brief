insert into public.assets (id, kind, symbol, name, currency, yahoo_ticker, coingecko_id, pea_eligible) values
  ('BTC',          'crypto', 'BTC',   'Bitcoin',                                          'USD', 'BTC-USD', 'bitcoin', false),
  ('FR0013412285', 'etf',    'PE500', 'Amundi PEA S&P 500 ESG UCITS ETF - Acc',           'EUR', 'PE500.PA', null, true),
  ('FR0011550185', 'etf',    'PANX',  'Amundi PEA Nasdaq-100 UCITS ETF - Acc',            'EUR', 'PANX.PA',  null, true),
  ('FR0011869353', 'etf',    'CW8',   'Amundi PEA MSCI World UCITS ETF - Acc',            'EUR', 'CW8.PA',   null, true),
  ('FR0010717090', 'etf',    'C6E',   'Amundi STOXX Europe 600 UCITS ETF - Acc',          'EUR', 'C6E.PA',   null, true),
  ('FR0013412020', 'etf',    'PE50',  'Amundi PEA Eurozone ESG UCITS ETF - Acc',          'EUR', 'PE50.PA',  null, true),
  ('FR0013412004', 'etf',    'PAEEM', 'Amundi PEA Emerging Markets ESG UCITS ETF - Acc',  'EUR', 'PAEEM.PA', null, true),
  ('FR0014002JC4', 'etf',    'PTPXE', 'Amundi PEA Japan Topix UCITS ETF - Acc',           'EUR', 'PTPXE.PA', null, true),
  ('FR0010315770', 'etf',    'EWLD',  'Lyxor PEA Monde MSCI World UCITS ETF - Cap',       'EUR', 'EWLD.PA',  null, true)
on conflict (id) do nothing;
