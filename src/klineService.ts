import * as https from 'https';

export interface KLineItem {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Referer': 'http://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        try {
          resolve(JSON.parse(buffer.toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export class KlineService {
  private cache: Map<string, { data: KLineItem[]; time: number }> = new Map();
  private cacheTTL = 60 * 1000;

  async getKLineData(symbol: string, days: number = 10): Promise<KLineItem[]> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.time < this.cacheTTL) {
      return cached.data;
    }

    const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=${days}`;

    try {
      const data = await fetchJson(url);
      if (Array.isArray(data)) {
        this.cache.set(symbol, { data, time: Date.now() });
        return data;
      }
      return [];
    } catch (error) {
      console.error(`获取K线数据失败 ${symbol}:`, (error as Error).message);
      return [];
    }
  }

  calculateMA(klineData: KLineItem[], period: number): string | null {
    if (klineData.length < period) {
      return null;
    }
    const recentData = klineData.slice(-period);
    const sum = recentData.reduce((acc, item) => acc + parseFloat(item.close), 0);
    return (sum / period).toFixed(2);
  }

  async getMA(symbol: string): Promise<{ ma5: string | null; ma10: string | null }> {
    const data = await this.getKLineData(symbol, 10);
    return {
      ma5: this.calculateMA(data, 5),
      ma10: this.calculateMA(data, 10)
    };
  }
}
