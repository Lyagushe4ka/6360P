import { BigNumber, ethers } from "ethers";
import { MIN_TOKEN_BALANCE, RPC_URL } from "../DEPENDENCIES";
import { tokens, domain } from "./Constants";
import erc20Abi from "./erc20Abi.json";
import { retry, roundTo, sendTelegramMessage } from "./Helpers";
import { SocksProxyAgent } from "socks-proxy-agent";
import axios from "axios";


const provoder = new ethers.providers.JsonRpcProvider(RPC_URL);

export async function findToken(address: string): Promise<[string, number] | null> {

  for (const token of Object.values(tokens)) {
    const tokenInstance = new ethers.Contract(token.address, erc20Abi, provoder);
    const balance = await retry<BigNumber>(() => tokenInstance.balanceOf(address));
    const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);

    if (Number(formattedBalance) >= MIN_TOKEN_BALANCE) {
      return [token.name, +formattedBalance];
    }
  }
  return null;
}

export async function approveIfNeeded(pk: string, tokenName: string, amount: number): Promise<boolean> {
  const signer = new ethers.Wallet(pk, provoder);
  const tokenInstance = new ethers.Contract(tokens[tokenName].address, erc20Abi, signer);
  const allowance = await retry<BigNumber>(() => tokenInstance.allowance(signer.address, domain.verifyingContract));
  const amountInWei = ethers.utils.parseUnits(amount.toString(), tokens[tokenName].decimals);

  try {
    if (allowance.lt(amountInWei)) {
      console.log(`Approving ${tokenName} on wallet: ${signer.address}`);
      const gasPrice = await retry(() => provoder.getGasPrice());
      const approve = await retry<ethers.providers.TransactionResponse>(() => tokenInstance.approve(domain.verifyingContract, ethers.constants.MaxUint256, { gasPrice: gasPrice.mul(120).div(100) }));

      const receipt = await retry(() => approve.wait());
      console.log(`Approved unlimited ${tokenName},  tx hash: ${receipt.transactionHash}`);
      await sendTelegramMessage(`🟢 APPROVED UNLIMITED ${tokenName} on wallet: ${signer.address}, tx hash: ${receipt.transactionHash}`);
    }
  } catch (e: any) {
    console.log(`[APPROVE] Error while approving ${tokenName}. Message: ${e.message}`);
    return false;
  }

  return true;
}

export async function getQuote(address: string, proxy: string, tokenFromName: string, amount: number): Promise<[string, number, Record<string, any>] | null> {

  const socksProxy = new SocksProxyAgent(`socks://${proxy}`);
  const tokenToName = tokenFromName === 'USDC' ? 'DAI' : 'USDC';

  let quote: any;
  try {
  quote = await retry(() => axios.get(
    `https://api.bebop.xyz/polygon/v1/quote?buy_tokens=${tokenToName}&sell_tokens=${tokenFromName}&sell_amounts=${roundTo(amount, 2)}&taker_address=${address}`,
    {
      httpAgent: socksProxy,
      httpsAgent: socksProxy,
    }
  ));
  } catch (e: any) {
    console.log(`[QUOTE] Error while getting quote. Message: ${e.message}`);
    return null;
  }

  if (quote.data.status !== 'QUOTE_SUCCESS') {
    console.log(`[QUOTE] Error while getting quote.`);
    return null;
  }

  return [quote.data.quoteId, quote.data.gasFee.usd, quote.data.toSign];
}

export async function executeOrder(signaute: string, quoteId: string, proxy: string): Promise<string | null> {

  const socksProxy = new SocksProxyAgent(`socks://${proxy}`);

  let order: any;
  try {
    order = await retry(() => axios.post(
      `https://api.bebop.xyz/polygon/v1/order`,
      {
        signature: signaute,
        quote_id: quoteId,
      },
      {
        httpAgent: socksProxy,
        httpsAgent: socksProxy,
      }
    ));
  } catch (e: any) {
    console.log(`[ORDER] Error while executing order. Message: ${e.message}`);
    return null;
  }
  if (order.data.status !== 'Success') {
    console.log(`[ORDER] Error while executing order. \n ${JSON.stringify(order.data, null, 2)}}`);
    return null;
  }
  return order.data.txHash;
}
