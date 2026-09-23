import * as vscode from 'vscode';
import { FundInfo } from './fundService';
import { THEME } from './theme';

export class FundProvider implements vscode.TreeDataProvider<FundItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FundItem | undefined | null> =
    new vscode.EventEmitter<FundItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<FundItem | undefined | null> =
    this._onDidChangeTreeData.event;

  private funds: FundInfo[] = [];

  setData(funds: FundInfo[]): void {
    this.funds = funds;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: FundItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FundItem): Thenable<FundItem[]> {
    if (element) { return Promise.resolve([]); }

    // 按涨跌幅排序
    const sortedFunds = [...this.funds].sort((a, b) => {
      const percentA = parseFloat(a.percent);
      const percentB = parseFloat(b.percent);
      return percentB - percentA;
    });

    const items = sortedFunds.map((fund) => {
      const percent = parseFloat(fund.percent);
      const isUp = percent > 0;
      const isDown = percent < 0;

      const pctStr = percent > 0 ? `+${fund.percent}%` : `${fund.percent}%`;
      const label = `${pctStr}  ${fund.price}`;

      const item = new FundItem(label, vscode.TreeItemCollapsibleState.None, fund);
      item.description = `[${fund.name}]`;
      item.tooltip = this.createTooltip(fund);

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

  private createTooltip(fund: FundInfo): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${fund.name}** (${fund.code})\n\n`);
    markdown.appendMarkdown(`估算净值: ${fund.price}  涨跌: ${fund.updown}  幅度: ${fund.percent}%\n\n`);
    markdown.appendMarkdown(`昨日净值: ${fund.yestclose}\n\n`);
    markdown.appendMarkdown(`日期: ${fund.time}`);
    return markdown;
  }
}

export class FundItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly fund: FundInfo
  ) {
    super(label, collapsibleState);
    this.contextValue = 'fund';
  }
}
