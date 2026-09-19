import * as vscode from 'vscode';
import { StockInfo } from './stockService';

export class BlameLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private stocks: StockInfo[] = [];
  private enabled = false;
  private currentLine: number = 0;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider({ scheme: 'file' }, this)
    );

    // 监听光标移动
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.enabled) {
        this.currentLine = editor.selection.active.line;
        this._onDidChangeCodeLenses.fire();
      }
    });

    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (this.enabled) {
        this.currentLine = event.selections[0].active.line;
        this._onDidChangeCodeLenses.fire();
      }
    });

    context.subscriptions.push(
      vscode.commands.registerCommand('miniLeekFund.toggleBlameLens', () => {
        this.enabled = !this.enabled;
        this._onDidChangeCodeLenses.fire();
        vscode.window.showInformationMessage(
          this.enabled ? 'Blame 伪装：已开启' : 'Blame 伪装：已关闭'
        );
      })
    );
  }

  setStocks(stocks: StockInfo[]): void {
    this.stocks = stocks;
    this._onDidChangeCodeLenses.fire();
  }

  cycle(): void {
    if (this.stocks.length > 1) {
      this.stocks.push(this.stocks.shift() as StockInfo);
    }
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.enabled || this.stocks.length === 0) {
      return [];
    }

    // 只在光标所在行显示
    const line = this.currentLine;
    if (line >= document.lineCount) {
      return [];
    }

    const stock = this.stocks[line % this.stocks.length];
    const range = new vscode.Range(line, 0, line, 0);
    const lens = new vscode.CodeLens(range, {
      title: this.buildTitle(stock),
      command: 'miniLeekFund.blameCycle',
      arguments: []
    });

    return [lens];
  }

  private buildTitle(stock: StockInfo): string {
    const user = 'Nicky · 刚刚';
    const changeText = this.stockChangeText(stock);

    if (stock.ma5 && stock.ma10) {
      return [
        `${user} · fix(cache): sync @${stock.code}`,
        `现价 ${stock.price}  涨跌 ${stock.updown}  涨跌幅 ${stock.percent}%`,
        `MA5 ${stock.ma5}  MA10 ${stock.ma10}`
      ].join('\n');
    }

    return `${user} · fix(cache): sync @${stock.code}\n${changeText}`;
  }

  private stockChangeText(stock: StockInfo): string {
    const rise = parseFloat(stock.percent) >= 0;
    const symbol = rise ? '▲' : '▼';
    return `${stock.name}(${stock.code}) ${symbol} ${stock.price} ${stock.percent}%`;
  }
}
