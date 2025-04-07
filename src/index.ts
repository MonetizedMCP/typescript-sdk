import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';
import axios from 'axios';

interface ITools {
  getBalance(localWalletAddress: string): Promise<string>;
  makePayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string
  ): Promise<{ toolResult: string; hash: string }>;
}

export class PaymentsTools implements ITools {
  private w3: Web3;
  private localWalletAddress: string;
  constructor() {
    const BASE_RPC_URL = 'https://sepolia.base.org';
    this.w3 = new Web3(new Web3.providers.HttpProvider(BASE_RPC_URL));
    const LOCAL_WALLET_PRIVATE_KEY = process.env.LOCAL_WALLET_PRIVATE_KEY;
    const localWallet = privateKeyToAccount(
      Uint8Array.from(Buffer.from(LOCAL_WALLET_PRIVATE_KEY!, 'hex'))
    );
    this.w3.eth.accounts.wallet.add(localWallet);
    this.localWalletAddress = localWallet.address;
  }

  getWalletAddress(): string {
    return this.localWalletAddress;
  }

  private async getETHPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      return response.data.ethereum.usd; // Returns ETH price in USD
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      throw error;
    }
  }

  async getBalance(localWalletAddress: string): Promise<string> {
    try {
      const balance = await this.w3.eth.getBalance(localWalletAddress);
      const balanceInETH = this.w3.utils.fromWei(balance, 'ether');
      const ethPriceInUSD = await this.getETHPrice();
      const balanceInUSDC = parseFloat(balanceInETH) * ethPriceInUSD;
      return balanceInUSDC.toFixed(2) + ' USDC';
    } catch (error: any) {
      return 'Error: ' + error.message;
    }
  }

  async makePayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string
  ): Promise<{ toolResult: string; hash: string }> {
    try {
      const amountWei = BigInt(Math.floor(amount * 10 ** 6));

      const nonce = await this.w3.eth.getTransactionCount(localWalletAddress);
      const gasPrice = await this.w3.eth.getGasPrice();

      const tx = {
        from: localWalletAddress,
        to: destinationWalletAddress,
        nonce: nonce.toString(),
        gas: '100000',
        gasPrice: gasPrice.toString(),
        value: amountWei.toString(),
      };

      const signedTx = await this.w3.eth.accounts.signTransaction(
        tx,
        process.env.LOCAL_WALLET_PRIVATE_KEY!
      );
      const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);

      return {
        toolResult: `Transaction sent: ${receipt.transactionHash}`,
        hash: receipt.transactionHash.toString(),
      };
    } catch (error: any) {
      return { toolResult: 'Error: ' + error.message, hash: '' };
    }
  }

  async verifyPayment(hash: string): Promise<boolean> {
    const receipt = await this.w3.eth.getTransactionReceipt(hash);
    return receipt.status === 1n;
  }
}
