import * as http from 'http';

export interface SuggestItem {
  code: string;
  name: string;
  label: string;
}

// 使用 TextDecoder 解码 GB18030
const decoder = new TextDecoder('gb18030');

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, {
      headers: {
        'Referer': 'http://finance.sina.com.cn/',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 5000
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

export async function fetchStockSuggest(keyword: string): Promise<SuggestItem[]> {
  if (!keyword || !keyword.trim()) {
    return [];
  }

  const url = `http://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(keyword)}`;

  try {
    const data = await fetchUrl(url);
    const match = data.match(/var suggestvalue="(.*)"/);
    if (!match || !match[1]) {
      return [];
    }

    const items: SuggestItem[] = [];
    const records = match[1].split(';');

    for (const record of records) {
      const fields = record.split(',');
      if (fields.length < 4) {
        continue;
      }

      const name = fields[0];
      const type = fields[1];
      const stockCode = fields[2];
      let fullCode = fields[3];

      if (!name || !fullCode) {
        continue;
      }

      // type 11/12 = A股（sh/sz），做前缀兼容
      if ((type === '11' || type === '12') && !fullCode.startsWith('sh') && !fullCode.startsWith('sz')) {
        if (stockCode.startsWith('6') || stockCode.startsWith('0')) {
          fullCode = stockCode.startsWith('6') ? `sh${stockCode}` : `sz${stockCode}`;
        }
      }

      // 只保留 A 股
      if (!fullCode.startsWith('sh') && !fullCode.startsWith('sz')) {
        continue;
      }

      items.push({
        code: fullCode,
        name: name,
        label: `${name}  ${fullCode}`
      });
    }

    // 去重
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.code)) {
        return false;
      }
      seen.add(item.code);
      return true;
    });
  } catch (error) {
    console.error('搜索建议失败:', (error as Error).message);
    return [];
  }
}
