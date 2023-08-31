import { Data, domain, types } from "./Constants";
import { ethers } from "ethers";
import fs from 'fs';
import { retry, sendTelegramMessage, shuffleArray, sleep } from "./Helpers";
import { MAX_TX_SINGLE, MAX_VOLUME, MAX_VOLUME_NEEDED, MAX_WAIT_TIME, MIN_WAIT_TIME, RPC_URL } from "../DEPENDENCIES";
import { approveIfNeeded, executeOrder, findToken, getQuote } from "./Modules";


let data: Record<string, Data> = {};
const provoder = new ethers.providers.JsonRpcProvider(RPC_URL);

async function main() {

  const pkArr = fs.readFileSync('keys.txt').toString().replaceAll('\r', '').split('\n');
  const ProxyArr = fs.readFileSync('proxies.txt').toString().replaceAll('\r', '').split('\n');

  if (pkArr.length !== ProxyArr.length) {
    console.log('Error: keys and proxies are not the same length.');
    return;
  }

  const pairs = pkArr.map((pk, i) => ({ pk, proxy: ProxyArr[i] }));

  if (fs.existsSync('walletsData.json')) {
    data = JSON.parse(fs.readFileSync('walletsData.json').toString());
  }

  while (true) {

    if (pairs.length === 0) {
      console.log('No more private keys to use');
      await sendTelegramMessage(`🏁 NO MORE KEYS LEFT TO USE, SCRIPT IS FINISHED`);
      fs.writeFileSync('walletsData.json', JSON.stringify(data, null, 2));
      return;
    }

    const pair = shuffleArray(pairs)[0];
    const wallet = new ethers.Wallet(pair.pk, provoder);

    if (MAX_VOLUME_NEEDED && data[wallet.address].volume && data[wallet.address].volume! < MAX_VOLUME) {

      console.log(`Volume for ${wallet.address} is less than ${MAX_VOLUME}, continuing swaps on wallet: ${wallet.address}`);
      
    } else if (data[wallet.address] && data[wallet.address].transactionsSingle && data[wallet.address].transactionsSingle! >= MAX_TX_SINGLE) {
      console.log('Max single transactions reached for address: ' + wallet.address);

      await sendTelegramMessage(`🗑 Max single transactions reached for address: ${wallet.address}, removing from list`);

      pairs.splice(pairs.indexOf(pair), 1);

      continue;
    }

    const token = await findToken(wallet.address);
    console.log(token)

    if (!token) {
      console.log(`No tokens found for ${wallet.address}, removing from list`);
      await sendTelegramMessage(`❌ No tokens found for address: ${wallet.address}, removing from list`);

      pairs.splice(pairs.indexOf(pair), 1);
      continue;
    }

    const [tokenName, balance] = token;
    const approve = await approveIfNeeded(pair.pk, tokenName, balance);

    if (!approve) {
      continue;
    }

    const quote = await getQuote(
      wallet.address,
      pair.proxy,
      tokenName,
      balance,
    );
    await sleep({ seconds: 2 });

    if (!quote) {
      continue;
    }

    const [id, fee, toSign] = quote;

    const signedData = await retry(() => wallet._signTypedData(
      domain,
      types,
      toSign,
    ));

    const order = await executeOrder(
      signedData,
      id,
      pair.proxy,
    );

    if (!order) {
      continue;
    }

    console.log(`[ORDER] Order executed for ${balance} ${tokenName} on wallet: ${wallet.address}, tx hash: ${order}`);

    await sendTelegramMessage(`🟢 ORDER EXECUTED for ${balance} ${tokenName} on wallet: ${wallet.address}, tx: https://polygonscan.com//tx/${order}`);

    data[wallet.address] = {
      ...data[wallet.address],
      transactionsSingle: data[wallet.address]?.transactionsSingle ? data[wallet.address].transactionsSingle! + 1 : 1,
      fees: data[wallet.address]?.fees ? data[wallet.address].fees! + +fee.toFixed(2) : +fee.toFixed(2),
      volume: data[wallet.address]?.volume ? data[wallet.address].volume! + +balance.toFixed(2) : +balance.toFixed(2),
    };

    await sleep({ minutes: MIN_WAIT_TIME }, { minutes: MAX_WAIT_TIME });
  }
}

// catching ctrl+c event
process.on('SIGINT', function() {
  console.log('Caught interrupt signal');

  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync('walletsData.json', jsonData);

  process.exit();
});

// catching unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', reason);

  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync('walletsData.json', jsonData);

  process.exit();
});

// catching uncaught exception
process.on('uncaughtException', (err, origin) => {
  console.log(`Caught exception: ${err}\n Exception origin: ${origin}`)

  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync('walletsData.json', jsonData);

  process.exit();
});

main();