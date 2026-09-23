import * as https from 'https';
import { ExtensionContext } from 'vscode';

export interface FundInfo {
  code: string;
  name: string;
  price: string;      // 今日估值（交易时段）或最新净值
  percent: string;    // 涨跌幅 %
  updown: string;     // 涨跌额
  yestclose: string;  // 昨日净值
  time: string;       // 更新时间
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Referer': 'https://fund.eastmoney.com/',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export async function searchFund(keyword: string): Promise<Array<{ code: string; name: string; label: string }>> {
  if (!keyword || !keyword.trim()) return [];

  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(keyword)}`;
  try {
    const data = await fetchText(url);
    const json = JSON.parse(data);
    const results: Array<{ code: string; name: string; label: string }> = [];
    const seen = new Set<string>();

    for (const item of (json.Datas || [])) {
      if ((item.CATEGORYDESC || '') !== '基金') continue;
      const code = item.CODE;
      const name = item.NAME;
      if (!code || !name || seen.has(code)) continue;
      seen.add(code);
      results.push({ code, name, label: `${name}  ${code}` });
    }
    return results;
  } catch (error) {
    console.error('搜索基金失败:', (error as Error).message);
    return [];
  }
}

export class FundService {
  public fundList: FundInfo[] = [];

  constructor(context: ExtensionContext) {}

  async fetchFunds(codes: string[]): Promise<FundInfo[]> {
    if (!codes || codes.length === 0) return [];

    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=50&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=1&Fcodes=${codes.join(',')}`;
    try {
      const data = await fetchText(url);
      const json = JSON.parse(data);
      const funds: FundInfo[] = [];

      for (const item of (json.Datas || [])) {
        const code = item.FCODE;
        const name = item.SHORTNAME;
        const nav = item.NAV;          // 单位净值
        const navChgrt = item.NAVCHGRT; // 涨跌幅 %
        const gsz = item.GSZ;          // 今日估值（交易时段）
        const gszzl = item.GSZZL;      // 估算涨幅 %
        const gztime = item.GZTIME || item.PDATE; // 更新时间

        // 交易时段优先用估值，否则用最新净值
        const price = gsz && gsz !== '-' ? gsz : nav;
        const percent = gszzl && gszzl !== '-' ? gszzl : navChgrt;

        const priceNum = parseFloat(price);
        const navNum = parseFloat(nav);
        const updown = navNum > 0 ? (priceNum - navNum).toFixed(4) : '0.0000';

        funds.push({
          code,
          name,
          price: priceNum.toFixed(4),
          percent: percent || '0.00',
          updown,
          yestclose: nav,
          time: gztime || ''
        });
      }

      this.fundList = funds;
      return funds;
    } catch (error) {
      console.error('获取基金数据失败:', (error as Error).message);
      return [];
    }
  }
}
