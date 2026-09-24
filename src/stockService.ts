import * as https from 'https';
import { ExtensionContext } from 'vscode';

export interface StockInfo {
  code: string;
  name: string;
  price: string;
  percent: string;
  updown: string;
  open: string;
  yestclose: string;
  high: string;
  low: string;
  volume: string;
  amount: string;
  time: string;
  ma5?: string | null;
  ma10?: string | null;
}

// 使用 TextDecoder 解码 GB18030
const decoder = new TextDecoder('gb18030');

// 兼容用户手填的裸代码：600519 -> sh600519，000001 -> sz000001
export function normalizeStockCode(raw: string): string | null {
  const code = (raw || '').trim().toLowerCase();
  if (!code) return null;
  if (/^(sh|sz|bj)\d{6}$/.test(code)) return code;
  if (/^\d{6}$/.test(code)) {
    if (code.startsWith('6') || code.startsWith('9')) return `sh${code}`;
    if (code.startsWith('4') || code.startsWith('8')) return `bj${code}`;
    return `sz${code}`;
  }
  return null;
}

function fetchUrl(url: string): Promise<string> {
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
        resolve(decoder.decode(buffer));
      });
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export class StockService {
  public stockList: StockInfo[] = [];
  public lastError: string = '';
  private context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  async fetchStocks(codes: string[]): Promise<StockInfo[]> {
    if (!codes || codes.length === 0) {
      return [];
    }

    const normalized = codes
      .map(normalizeStockCode)
      .filter((c): c is string => !!c);

    if (normalized.length === 0) {
      this.lastError = '股票代码格式不正确，应为 6 位数字或 sh/sz 开头（如 sh600519）';
      return [];
    }

    try {
      const url = `https://hq.sinajs.cn/list=${normalized.join(',')}`;
      const data = await fetchUrl(url);

      if (!data.includes('FAILED')) {
        const stocks = this.parseBatch(data);
        this.stockList = stocks;
        this.lastError = stocks.length === 0 ? '接口返回数据为空' : '';
        return stocks;
      }

      // 只要有 1 个无效代码，整批就会 FAILED。逐个请求，只保留有效的。
      const stocks: StockInfo[] = [];
      for (const code of normalized) {
        try {
          const single = await fetchUrl(`https://hq.sinajs.cn/list=${code}`);
          if (!single.includes('FAILED')) {
            stocks.push(...this.parseBatch(single));
          } else {
            this.lastError = `无效股票代码: ${code}`;
          }
        } catch (error) {
          this.lastError = `获取 ${code} 失败: ${(error as Error).message}`;
        }
      }

      this.stockList = stocks;
      if (stocks.length === 0 && !this.lastError) {
        this.lastError = '没有获取到任何股票数据';
      }
      return stocks;
    } catch (error) {
      this.lastError = `获取股票数据失败: ${(error as Error).message}`;
      console.error(this.lastError);
      return [];
    }
  }

  private parseBatch(data: string): StockInfo[] {
    const lines = data.split(/\r?\n/).filter(l => l.includes('hq_str_'));
    const stocks: StockInfo[] = [];

    for (const line of lines) {
      const codeMatch = line.split('="');
      if (codeMatch.length < 2) continue;

      const code = codeMatch[0].split('var hq_str_')[1];
      const paramStr = codeMatch[1];
      if (!paramStr) continue;

      const params = paramStr.split(',');
      if (params.length < 32) continue;

      const name = params[0];
      const open = params[1];
      const yestclose = params[2];
      let price = params[3];
      const high = params[4];
      const low = params[5];
      const volume = params[8];
      const amount = params[9];
      const time = `${params[30]} ${params[31]}`;

      const priceNum = parseFloat(price);
      const yestcloseNum = parseFloat(yestclose);

      if (priceNum === 0) {
        const buy1 = parseFloat(params[6]);
        if (buy1 !== 0) {
          price = params[6];
        } else {
          price = yestclose;
        }
      }

      const finalPrice = parseFloat(price);
      const updown = (finalPrice - yestcloseNum).toFixed(2);
      const percent = yestcloseNum > 0
        ? ((finalPrice - yestcloseNum) / yestcloseNum * 100).toFixed(2)
        : '0.00';

      stocks.push({
        code,
        name,
        price,
        percent,
        updown,
        open,
        yestclose,
        high,
        low,
        volume: this.formatVolume(volume),
        amount: this.formatAmount(amount),
        time
      });
    }

    return stocks;
  }

  private formatVolume(volume: string): string {
    const num = parseFloat(volume);
    if (num >= 100000000) {
      return (num / 100000000).toFixed(2) + '亿';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return volume;
  }

  private formatAmount(amount: string): string {
    const num = parseFloat(amount);
    if (num >= 100000000) {
      return (num / 100000000).toFixed(2) + '亿';
    }
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return amount;
  }

  isTradingTime(): boolean {
    const now = new Date();
    const day = now.getDay();

    if (day === 0 || day === 6) {
      return false;
    }

    const hours = now.getHours();
    const minutes = now.getMinutes();
    const time = hours * 60 + minutes;

    const morningStart = 9 * 60 + 15;
    const morningEnd = 11 * 60 + 30;
    const afternoonStart = 13 * 60;
    const afternoonEnd = 15 * 60;

    return (time >= morningStart && time <= morningEnd) ||
           (time >= afternoonStart && time <= afternoonEnd);
  }
}
