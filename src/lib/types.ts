export type Headline = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
};

export type Salad = {
  id: number;
  name: string;
  ingredients: string[];
  description: string;
};

export type BriefSnapshot = {
  id: string;
  brief_date: string;
  btc_price: number;
  btc_change_24h: number;
  headlines: Headline[];
  crypto_headlines: Headline[];
  salad_ids: number[];
  created_at: string;
};

export type BriefView = {
  briefDate: string;
  btcPrice: number;
  btcChange24h: number;
  headlines: Headline[];
  cryptoHeadlines: Headline[];
  salads: Salad[];
  refreshedAt: string;
};
