const axios = require('axios');

async function getKLineData(symbol, days = 15) {
  // 新浪财经K线接口
  // scale: 240表示日线，datalen: 返回数据条数
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=${days}`;
  
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('获取K线数据失败:', error.message);
    return [];
  }
}

function calculateMA(klineData, period) {
  if (klineData.length < period) {
    return null;
  }
  
  // 取最近period天的收盘价计算平均值
  const recentData = klineData.slice(-period);
  const sum = recentData.reduce((acc, item) => acc + parseFloat(item.close), 0);
  return (sum / period).toFixed(2);
}

async function demo() {
  const symbol = 'sh600519'; // 贵州茅台
  
  console.log(`获取 ${symbol} 的K线数据...\n`);
  const klineData = await getKLineData(symbol, 15);
  
  if (klineData.length === 0) {
    console.log('未获取到数据');
    return;
  }
  
  console.log('最近5天K线数据:');
  klineData.slice(-5).forEach(item => {
    console.log(`  ${item.day}  收盘: ${item.close}  成交量: ${item.volume}`);
  });
  
  console.log('\n均线计算:');
  const ma5 = calculateMA(klineData, 5);
  const ma10 = calculateMA(klineData, 10);
  
  console.log(`  MA5 (5日均线):  ${ma5 || '数据不足'}`);
  console.log(`  MA10 (10日均线): ${ma10 || '数据不足'}`);
  
  // 判断金叉/死叉
  if (ma5 && ma10) {
    const prevMa5 = calculateMA(klineData.slice(0, -1), 5);
    const prevMa10 = calculateMA(klineData.slice(0, -1), 10);
    
    if (prevMa5 && prevMa10) {
      const currentMa5 = parseFloat(ma5);
      const currentMa10 = parseFloat(ma10);
      const prevMa5Num = parseFloat(prevMa5);
      const prevMa10Num = parseFloat(prevMa10);
      
      if (prevMa5Num <= prevMa10Num && currentMa5 > currentMa10) {
        console.log('\n  📈 金叉信号: MA5上穿MA10');
      } else if (prevMa5Num >= prevMa10Num && currentMa5 < currentMa10) {
        console.log('\n  📉 死叉信号: MA5下穿MA10');
      } else if (currentMa5 > currentMa10) {
        console.log('\n  📈 多头排列: MA5 > MA10');
      } else {
        console.log('\n  📉 空头排列: MA5 < MA10');
      }
    }
  }
}

demo();
