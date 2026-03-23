import { useEffect, useState } from 'react';
import { walletService } from '../services/api';
import { Coins, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        walletService.getBalance(),
        walletService.getTransactions(),
      ]);
      setBalance(balanceRes.data.points);
      setTransactions(txRes.data);
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">积分钱包</h1>

      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">当前余额</p>
            <div className="flex items-center mt-2">
              <Coins className="w-8 h-8 mr-3" />
              <span className="text-4xl font-bold">{balance}</span>
              <span className="text-primary-200 ml-2">积分</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-100 text-sm">收支概况</p>
            <p className="text-sm mt-2">
              <span className="inline-flex items-center text-green-300">
                <TrendingUp className="w-4 h-4 mr-1" />
                {transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)}
              </span>
              <span className="mx-2">/</span>
              <span className="inline-flex items-center text-red-300">
                <TrendingDown className="w-4 h-4 mr-1" />
                {transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">交易记录</h2>

        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${
                    tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`text-lg font-semibold ${
                  tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
