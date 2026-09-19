import * as vscode from 'vscode';
import { StockInfo } from './stockService';
import { THEME } from './theme';

export class StatusBar {
  private items: Map<string, vscode.StatusBarItem> = new Map();

  private isIndex(code: string): boolean {
    return code.startsWith('sh000') || code.startsWith('sz399');
  }

  private formatPrice(stock: StockInfo): string {
    if (this.isIndex(stock.code)) {
      return stock.price;
    }
    return parseFloat(stock.price).toFixed(2);
  }

  update(stocks: StockInfo[]): void {
    const config = vscode.workspace.getConfiguration('miniLeekFund');
    const statusBarStocks: string[] = config.get('statusBarStocks') || [];

    const activeCodes = new Set<string>();
    for (const code of statusBarStocks) {
      const stock = stocks.find(s => s.code === code);
      if (stock) {
        activeCodes.add(code);
        this.updateItem(stock);
      }
    }

    for (const [code, item] of this.items) {
      if (!activeCodes.has(code)) {
        item.dispose();
        this.items.delete(code);
      }
    }
  }

  private updateItem(stock: StockInfo): void {
    let item = this.items.get(stock.code);
    if (!item) {
      item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100 - this.items.size);
      this.items.set(stock.code, item);
    }

    const percent = parseFloat(stock.percent);
    const isUp = percent > 0;
    const isDown = percent < 0;

    // 名字只显示前两个字
    const shortName = stock.name.slice(0, 2);
    const displayPrice = this.formatPrice(stock);

    item.text = `${shortName} ${displayPrice} ${stock.percent}%`;

    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${stock.name}** (${stock.code})\n\n`);
    md.appendMarkdown(`价格: ${displayPrice}  涨跌: ${stock.updown}  幅度: ${stock.percent}%\n\n`);
    md.appendMarkdown(`今开: ${stock.open}  昨收: ${stock.yestclose}\n\n`);
    md.appendMarkdown(`最高: ${stock.high}  最低: ${stock.low}\n\n`);
    md.appendMarkdown(`成交量: ${stock.volume}  成交额: ${stock.amount}\n\n`);
    if (stock.ma5 || stock.ma10) {
      md.appendMarkdown(`MA5: ${stock.ma5 || '-'}  MA10: ${stock.ma10 || '-'}\n\n`);
    }
    md.appendMarkdown(`更新时间: ${stock.time}`);
    item.tooltip = md;

    // 状态栏颜色：白色涨，灰色跌
    if (isUp) {
      item.color = THEME.statusBar.up;
    } else if (isDown) {
      item.color = THEME.statusBar.down;
    } else {
      item.color = THEME.statusBar.flat;
    }

    item.command = {
      title: '状态栏股票操作',
      command: 'miniLeekFund.statusBarClick',
      arguments: [stock.code]
    };

    item.show();
  }

  dispose(): void {
    for (const item of this.items.values()) {
      item.dispose();
    }
    this.items.clear();
  }
}
