import * as vscode from 'vscode';
import { StockInfo } from './stockService';
import { KlineService } from './klineService';
import { THEME } from './theme';

export class StockProvider implements vscode.TreeDataProvider<StockItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<StockItem | undefined | null> =
    new vscode.EventEmitter<StockItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<StockItem | undefined | null> =
    this._onDidChangeTreeData.event;

  private stocks: StockInfo[] = [];
  private klineService: KlineService;

  constructor() {
    this.klineService = new KlineService();
  }

  setData(stocks: StockInfo[]): void {
    this.stocks = stocks;
    this._onDidChangeTreeData.fire(undefined);
  }

  async loadMAIndicators(): Promise<void> {
    if (this.stocks.length === 0) { return; }

    const tasks = this.stocks.map(async (stock) => {
      try {
        const { ma5, ma10 } = await this.klineService.getMA(stock.code);
        stock.ma5 = ma5;
        stock.ma10 = ma10;
      } catch (error) {
        console.error('loadMA error', stock.code, error);
      }
    });

    await Promise.all(tasks);
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: StockItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: StockItem): Thenable<StockItem[]> {
    if (element) { return Promise.resolve([]); }

    const config = vscode.workspace.getConfiguration('miniLeekFund');
    const statusBarStocks: string[] = config.get('statusBarStocks') || [];

    // 按涨跌幅排序（从高到低）
    const sortedStocks = [...this.stocks].sort((a, b) => {
      const percentA = parseFloat(a.percent);
      const percentB = parseFloat(b.percent);
      return percentB - percentA;
    });

    const items = sortedStocks.map((stock) => {
      const percent = parseFloat(stock.percent);
      const isUp = percent > 0;
      const isDown = percent < 0;
      const isInStatusBar = statusBarStocks.includes(stock.code);

      // 涨跌幅带符号，如 +2.90% / -0.17%
      const pctStr = percent > 0 ? `+${stock.percent}%` : `${stock.percent}%`;

      // label: 涨跌幅  价格    description: [名称]
      const label = `${pctStr}  ${stock.price}`;
      const item = new StockItem(label, vscode.TreeItemCollapsibleState.None, stock);

      item.description = `[${stock.name}]${isInStatusBar ? ' ★' : ''}`;
      item.tooltip = this.createTooltip(stock);

      // 红涨绿跌：红色箭头=涨，绿色箭头=跌，灰色横线=平
      if (isUp) {
        item.iconPath = new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.red'));
      } else if (isDown) {
        item.iconPath = new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
      } else {
        item.iconPath = new vscode.ThemeIcon('dash', new vscode.ThemeColor('charts.yellow'));
      }

      return item;
    });

    return Promise.resolve(items);
  }

  private createTooltip(stock: StockInfo): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${stock.name}** (${stock.code})\n\n`);
    markdown.appendMarkdown(`价格: ${stock.price}  涨跌: ${stock.updown}  幅度: ${stock.percent}%\n\n`);
    markdown.appendMarkdown(`今开: ${stock.open}  昨收: ${stock.yestclose}\n\n`);
    markdown.appendMarkdown(`最高: ${stock.high}  最低: ${stock.low}\n\n`);
    markdown.appendMarkdown(`成交量: ${stock.volume}  成交额: ${stock.amount}\n\n`);

    if (stock.ma5 || stock.ma10) {
      markdown.appendMarkdown(`**均线指标**\n\n`);
      markdown.appendMarkdown(`MA5: ${stock.ma5 || '数据不足'}  MA10: ${stock.ma10 || '数据不足'}\n\n`);

      if (stock.ma5 && stock.ma10) {
        const ma5Num = parseFloat(stock.ma5);
        const ma10Num = parseFloat(stock.ma10);
        const priceNum = parseFloat(stock.price);

        if (ma5Num > ma10Num) {
          markdown.appendMarkdown(`📈 多头排列 (MA5 > MA10)\n\n`);
        } else {
          markdown.appendMarkdown(`📉 空头排列 (MA5 < MA10)\n\n`);
        }

        if (priceNum > ma5Num && priceNum > ma10Num) {
          markdown.appendMarkdown(`价格在均线之上，偏强\n\n`);
        } else if (priceNum < ma5Num && priceNum < ma10Num) {
          markdown.appendMarkdown(`价格在均线之下，偏弱\n\n`);
        }
      }
    } else {
      markdown.appendMarkdown(`均线: 加载中...\n\n`);
    }

    markdown.appendMarkdown(`更新时间: ${stock.time}`);
    return markdown;
  }
}

export class StockItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly stock: StockInfo
  ) {
    super(label, collapsibleState);
    this.contextValue = 'stock';
  }
}
