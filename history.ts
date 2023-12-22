async function fetchTrades({
  wallet,
  limit = 10,
  offset = 0,
}: {
  wallet: string;
  limit: number;
  offset: number;
}) {
  async function fetchBatch() {
    const input = encodeURIComponent(
      JSON.stringify({
        "0": {
          json: {
            wallet,
            limit,
            offset,
          },
        },
      })
    );

    return (
      await fetch(
        `https://perp-api.zhen8558.workers.dev/trpc/trades?batch=1&input=${input}`
      )
    ).json();
  }

  const batch = await fetchBatch();
  return {
    trades: batch[0].result.data.json.trades,
    total: Number(batch[0].result.data.json.count),
  };
}

type Data = {
  [day: string]: {
    pnl: number;
  };
};

function printData(data: Data) {
  let totalPnl = 0;

  Object.entries(data).forEach(([day, { pnl }]) => {
    totalPnl += pnl;
    console.log(`${day}: $${(pnl / 1000000).toFixed(2)}`);
  });

  console.log("");
  console.log("Total PnL: $" + (totalPnl / 1000000).toFixed(2));
}

async function main() {
  const wallet = Bun.argv[2];
  if (!wallet) {
    console.error("Missing wallet address");
    console.error('Specify with "bun history.ts <wallet address>"');
    return;
  }

  const limit = Number(Bun.argv[3]) || 50;

  const data: Data = {};

  let trades: any[];
  let total = 0;
  let offset = 0;

  function processTrades(trades) {
    offset += trades.length;

    trades.forEach((trade) => {
      const date = new Date(trade.createdAt).toLocaleDateString();

      if (!data[date]) {
        data[date] = {
          pnl: 0,
        };
      }

      data[date].pnl += Number(trade.pnlUsd);
    });
  }

  try {
    ({ trades, total } = await fetchTrades({
      wallet,
      limit,
      offset,
    }));
  } catch (error) {
    console.error("Failed to fetch trades", error);
    return;
  }

  processTrades(trades);

  while (offset < total - 1) {
    try {
      ({ trades } = await fetchTrades({
        wallet,
        limit,
        offset,
      }));
    } catch (error) {
      console.error("Failed to fetch trades", error);
      return;
    }

    processTrades(trades);
  }

  printData(data);
}

await main();

export {};
