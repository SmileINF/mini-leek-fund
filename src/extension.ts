import * as vscode from 'vscode';
import { StockService, StockInfo } from './stockService';
import { StockProvider, StockItem } from './stockProvider';
import { FundService, FundInfo, searchFund } from './fundService';
import { FundProvider, FundItem } from './fundProvider';
import { StatusBar } from './statusBar';
import { BlameLensProvider } from './blameLens';
import { fetchStockSuggest } from './suggestService';

let timer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
  const stockService = new StockService(context);
  const stockProvider = new StockProvider();
  const fundService = new FundService(context);
  const fundProvider = new FundProvider();
  const statusBar = new StatusBar();
  const blameLens = new BlameLensProvider(context);

  const treeView = vscode.window.createTreeView('miniLeekFund.stocks', {
    treeDataProvider: stockProvider
  });
  const fundTreeView = vscode.window.createTreeView('miniLeekFund.funds', {
    treeDataProvider: fundProvider
  });
  context.subscriptions.push(treeView, fundTreeView);

  const doRefresh = async () => {
    const config = vscode.workspace.getConfiguration('miniLeekFund');
    const stocks: string[] = config.get('stocks') || [];
    const funds: string[] = config.get('funds') || [];

    if (stocks.length > 0) {
      const data = await stockService.fetchStocks(stocks);
      if (data.length > 0) {
        stockProvider.setData(data);
        statusBar.update(data);
        blameLens.setStocks(data);
        stockProvider.loadMAIndicators().catch(() => {});
      }
    }

    if (funds.length > 0) {
      const fundData = await fundService.fetchFunds(funds);
      if (fundData.length > 0) {
        fundProvider.setData(fundData);
      }
    }
  };

  const startLoop = () => {
    if (timer) { clearInterval(timer); }
    const interval: number = vscode.workspace.getConfiguration('miniLeekFund').get('interval') || 5000;
    doRefresh();
    timer = setInterval(() => {
      if (stockService.isTradingTime()) { doRefresh(); }
    }, interval);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('miniLeekFund.addStock', async () => {
      const qp = vscode.window.createQuickPick();
      qp.placeholder = '输入股票代码或名称（如：600519、茅台）';
      qp.items = [{ label: '请输入关键词搜索...', description: '' }];

      let timer: NodeJS.Timeout | null = null;

      qp.onDidChangeValue((value) => {
        qp.busy = true;
        if (timer) { clearTimeout(timer); timer = null; }
        timer = setTimeout(async () => {
          const results = await fetchStockSuggest(value);
          const config = vscode.workspace.getConfiguration('miniLeekFund');
          const stocks: string[] = config.get('stocks') || [];

          if (results.length === 0) {
            qp.items = value ? 
              [{ label: '未找到匹配结果', description: '尝试输入完整的股票代码' }] :
              [{ label: '请输入关键词搜索...', description: '' }];
          } else {
            qp.items = results.map(r => ({
              label: r.label,
              description: stocks.includes(r.code) ? '已在自选列表中' : ''
            }));
          }
          qp.busy = false;
        }, 300);
      });

      qp.onDidAccept(() => {
        const selected = qp.selectedItems[0];
        if (!selected) { return; }

        const parts = selected.label.split('  ');
        if (parts.length >= 2) {
          const code = parts[parts.length - 1].trim();
          const config = vscode.workspace.getConfiguration('miniLeekFund');
          const stocks: string[] = config.get('stocks') || [];

          if (stocks.includes(code)) {
            vscode.window.showWarningMessage('已在自选列表中');
          } else {
            stocks.push(code);
            config.update('stocks', stocks, vscode.ConfigurationTarget.Global).then(() => {
              vscode.window.showInformationMessage(`已添加: ${selected.label}`);
              doRefresh();
            });
          }
        }
        qp.hide();
      });

      qp.show();
      qp.onDidHide(() => { qp.dispose(); });
    }),

    vscode.commands.registerCommand('miniLeekFund.addFund', async () => {
      const qp = vscode.window.createQuickPick();
      qp.placeholder = '输入基金代码或名称（如：000011、白酒）';
      qp.items = [{ label: '请输入关键词搜索...', description: '' }];

      let timer: NodeJS.Timeout | null = null;

      qp.onDidChangeValue((value) => {
        qp.busy = true;
        if (timer) { clearTimeout(timer); timer = null; }
        timer = setTimeout(async () => {
          const results = await searchFund(value);
          const config = vscode.workspace.getConfiguration('miniLeekFund');
          const funds: string[] = config.get('funds') || [];

          if (results.length === 0) {
            qp.items = value ? 
              [{ label: '未找到匹配结果', description: '尝试输入完整的基金代码' }] :
              [{ label: '请输入关键词搜索...', description: '' }];
          } else {
            qp.items = results.map(r => ({
              label: r.label,
              description: funds.includes(r.code) ? '已添加' : ''
            }));
          }
          qp.busy = false;
        }, 300);
      });

      qp.onDidAccept(() => {
        const selected = qp.selectedItems[0];
        if (!selected) { return; }

        const parts = selected.label.split('  ');
        if (parts.length >= 2) {
          const code = parts[parts.length - 1].trim();
          const config = vscode.workspace.getConfiguration('miniLeekFund');
          const funds: string[] = config.get('funds') || [];

          if (funds.includes(code)) {
            vscode.window.showWarningMessage('已添加该基金');
          } else {
            funds.push(code);
            config.update('funds', funds, vscode.ConfigurationTarget.Global).then(() => {
              vscode.window.showInformationMessage(`已添加: ${selected.label}`);
              doRefresh();
            });
          }
        }
        qp.hide();
      });

      qp.show();
      qp.onDidHide(() => { qp.dispose(); });
    }),

    vscode.commands.registerCommand('miniLeekFund.removeFund', async (item: FundItem) => {
      if (!item?.fund?.code) { return; }
      const code = item.fund.code;
      const config = vscode.workspace.getConfiguration('miniLeekFund');
      const funds: string[] = config.get('funds') || [];
      const idx = funds.indexOf(code);
      if (idx !== -1) {
        funds.splice(idx, 1);
        await config.update('funds', funds, vscode.ConfigurationTarget.Global);
        await doRefresh();
      }
    }),

    vscode.commands.registerCommand('miniLeekFund.removeStock', async (item: StockItem) => {
      if (!item?.stock?.code) { return; }
      const code = item.stock.code;
      const config = vscode.workspace.getConfiguration('miniLeekFund');
      const stocks: string[] = config.get('stocks') || [];
      const idx = stocks.indexOf(code);
      if (idx !== -1) {
        stocks.splice(idx, 1);
        await config.update('stocks', stocks, vscode.ConfigurationTarget.Global);
        // 同时从状态栏移除
        const sb: string[] = config.get('statusBarStocks') || [];
        const sbIdx = sb.indexOf(code);
        if (sbIdx !== -1) {
          sb.splice(sbIdx, 1);
          await config.update('statusBarStocks', sb, vscode.ConfigurationTarget.Global);
        }
        await doRefresh();
      }
    }),

    vscode.commands.registerCommand('miniLeekFund.addToStatusBar', async (item: StockItem) => {
      if (!item?.stock?.code) { return; }
      const code = item.stock.code;
      const config = vscode.workspace.getConfiguration('miniLeekFund');
      const sb: string[] = config.get('statusBarStocks') || [];
      if (!sb.includes(code)) {
        sb.push(code);
        await config.update('statusBarStocks', sb, vscode.ConfigurationTarget.Global);
        stockProvider.setData(stockProvider['stocks']);
        await doRefresh();
      }
    }),

    vscode.commands.registerCommand('miniLeekFund.removeFromStatusBar', async (item: StockItem) => {
      if (!item?.stock?.code) { return; }
      const code = item.stock.code;
      const config = vscode.workspace.getConfiguration('miniLeekFund');
      const sb: string[] = config.get('statusBarStocks') || [];
      const idx = sb.indexOf(code);
      if (idx !== -1) {
        sb.splice(idx, 1);
        await config.update('statusBarStocks', sb, vscode.ConfigurationTarget.Global);
        stockProvider.setData(stockProvider['stocks']);
        await doRefresh();
      }
    }),

    vscode.commands.registerCommand('miniLeekFund.refreshStocks', async () => {
      await doRefresh();
    }),

    vscode.commands.registerCommand('miniLeekFund.blameCycle', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { return; }
      blameLens.cycle();
    }),

    vscode.commands.registerCommand('miniLeekFund.statusBarClick', async (code: string) => {
      if (!code) { return; }
      const config = vscode.workspace.getConfiguration('miniLeekFund');
      const sb: string[] = config.get('statusBarStocks') || [];

      const stockMap = new Map<string, StockInfo>();
      for (const s of stockService.stockList) { stockMap.set(s.code, s); }

      interface PickItem extends vscode.QuickPickItem { code?: string; action?: string; }
      const items: PickItem[] = [];

      const current = stockMap.get(code);
      const currentName = current ? current.name : code;
      items.push({
        label: '$(trash) 删除 -1',
        description: `将 ${currentName} 从底部状态栏删除`,
        action: 'delete'
      });

      const watchList: string[] = config.get('stocks') || [];
      for (const c of watchList) {
        const info = stockMap.get(c);
        const isCurrent = c === code;
        items.push({
          label: info ? `${info.name}  ${info.price}` : c,
          description: `${c}${isCurrent ? ' (当前显示)' : ''}${sb.includes(c) ? ' ★' : ''}`,
          code: c
        });
      }

      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: `管理状态栏股票: ${currentName} (${code})`
      });
      if (!picked) { return; }

      if (picked.action === 'delete') {
        const idx = sb.indexOf(code);
        if (idx !== -1) {
          sb.splice(idx, 1);
          await config.update('statusBarStocks', sb, vscode.ConfigurationTarget.Global);
        }
      } else if (picked.code) {
        const newCode = picked.code;
        if (newCode !== code) {
          const dupIdx = sb.indexOf(newCode);
          if (dupIdx !== -1) { sb.splice(dupIdx, 1); }
          const curIdx = sb.indexOf(code);
          if (curIdx !== -1) { sb[curIdx] = newCode; } else { sb.push(newCode); }
          await config.update('statusBarStocks', sb, vscode.ConfigurationTarget.Global);
        }
      }

      await doRefresh();
    })
  );

  context.subscriptions.push({
    dispose: () => { if (timer) { clearInterval(timer); } statusBar.dispose(); }
  });

  startLoop();
  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('miniLeekFund')) { startLoop(); }
  });
}

export function deactivate() {}
