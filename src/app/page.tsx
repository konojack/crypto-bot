export const dynamic = 'force-dynamic';
import ccxt from 'ccxt';

// UWAGA: Wartości kluczy API wpisz w pliku .env.local (nie commituj ich do repo!)
// Przykład pliku .env.local:
// KRAKEN_MASTER_API_KEY=twoj_master_key
// KRAKEN_MASTER_API_SECRET=twoj_master_secret
// KRAKEN_SUB1_API_KEY=twoj_sub1_key
// KRAKEN_SUB1_API_SECRET=twoj_sub1_secret
// KRAKEN_SUB2_API_KEY=twoj_sub2_key
// KRAKEN_SUB2_API_SECRET=twoj_sub2_secret
// itd.

async function getKrakenFuturesBalances() {
  // Pobierz klucze z env (w Next.js backend: process.env, frontend: NIE WOLNO!)
  // Tu tylko przykład, w praktyce zrób to po stronie serwera (API route lub server action)
  const accountsFutures = [
    {
      name: 'Master',
      apiKey: process.env.KRAKEN_MASTER_API_KEY!,
      secret: process.env.KRAKEN_MASTER_API_SECRET!,
    },
    {
      name: 'Subaccount 1',
      apiKey: process.env.KRAKEN_SUB1_API_KEY!,
      secret: process.env.KRAKEN_SUB1_API_SECRET!,
    },
    {
      name: 'Subaccount 2',
      apiKey: process.env.KRAKEN_SUB2_API_KEY!,
      secret: process.env.KRAKEN_SUB2_API_SECRET!,
    },
    {
      name: 'Subaccount 3',
      apiKey: process.env.KRAKEN_SUB3_API_KEY!,
      secret: process.env.KRAKEN_SUB3_API_SECRET!,
    },
    {
      name: 'Subaccount 4',
      apiKey: process.env.KRAKEN_SUB4_API_KEY!,
      secret: process.env.KRAKEN_SUB4_API_SECRET!,
    },
  ];

  const results: {
    name: string;
    balance: {
      total: Record<string, number>;
      free: Record<string, number>;
      used: Record<string, number>;
    } | null;
    error?: string;
    totalUSD?: number;
    infoUSD?: number;
    sumUSD?: number;
  }[] = [];

  for (const acc of accountsFutures) {
    try {
      const kraken = new ccxt.krakenfutures({
        apiKey: acc.apiKey,
        secret: acc.secret,
      });
      const balance = await kraken.fetchBalance();
      // Helper: filtruje tylko liczby i konwertuje na number
      function filterNumbers(obj: unknown): Record<string, number> {
        const out: Record<string, number> = {};
        if (obj && typeof obj === 'object') {
          for (const k in obj as Record<string, unknown>) {
            const v = (obj as Record<string, unknown>)[k];
            if (typeof v === 'number' && !isNaN(v)) out[k] = v;
          }
        }
        return out;
      }
      // Suma USD z total
      let totalUSD = 0;
      const totalObj = balance.total as unknown as Record<string, number>;
      if (totalObj && typeof totalObj['USD'] === 'number') {
        totalUSD = totalObj['USD'];
      }
      // Suma USD z balance.info.accounts.cash.balances.usd
      let infoUSD = 0;
      if (
        balance.info &&
        balance.info.accounts &&
        balance.info.accounts.cash &&
        balance.info.accounts.cash.balances &&
        (typeof balance.info.accounts.cash.balances.usd === 'string' ||
          typeof balance.info.accounts.cash.balances.usd === 'number')
      ) {
        infoUSD = parseFloat(balance.info.accounts.cash.balances.usd);
      }
      results.push({
        name: acc.name,
        balance: {
          total: filterNumbers(balance.total),
          free: filterNumbers(balance.free),
          used: filterNumbers(balance.used),
        },
        error: undefined,
        totalUSD,
        infoUSD,
        sumUSD: totalUSD + infoUSD,
      });
    } catch (e) {
      let errorMsg = 'Unknown error';
      if (e instanceof Error) errorMsg = e.message;
      results.push({ name: acc.name, balance: null, error: errorMsg });
    }
  }
  return results;
}

export default async function Home() {
  const balances = await getKrakenFuturesBalances();
  // Możesz zmienić tę wartość na dowolną stawkę początkową
  const initialStake: number = 5000; // USD
  const totalUSD = balances.reduce((sum, acc) => sum + (acc.sumUSD ?? 0), 0);
  const profit = totalUSD - initialStake;
  const profitPercent =
    Number(initialStake) !== 0 ? (profit / Number(initialStake)) * 100 : 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <ul>
        {balances.map((acc) => (
          <li key={acc.name} style={{ marginBottom: 32 }}>
            <strong>{acc.name}:</strong>
            {acc.error ? (
              <span style={{ color: 'red' }}> Błąd: {acc.error}</span>
            ) : acc.balance ? (
              <>
                <div>
                  <strong>Futures USD (balance.total.USD):</strong>{' '}
                  {acc.totalUSD}
                </div>
                <div>
                  <strong>
                    Holding USD (balance.info.accounts.cash.balances.usd):
                  </strong>{' '}
                  {acc.infoUSD}
                </div>
                <div>
                  <strong>SUM USD:</strong> {acc.sumUSD}
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {/* Suma wszystkich sumUSD */}
      <div style={{ marginTop: 32, fontWeight: 'bold', fontSize: 18 }}>
        TOTAL USD from all accounts: {totalUSD}
      </div>
      <div style={{ marginTop: 16, fontWeight: 'bold', fontSize: 16 }}>
        Initial stake: {initialStake} USD
      </div>
      <div
        style={{
          marginTop: 8,
          fontWeight: 'bold',
          fontSize: 16,
          color: profit >= 0 ? 'green' : 'red',
        }}
      >
        {profit >= 0 ? 'PROFIT' : 'LOSS'}: {profit.toFixed(2)} USD (
        {profitPercent.toFixed(2)}%)
      </div>
    </main>
  );
}
