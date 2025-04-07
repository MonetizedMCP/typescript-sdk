import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';

interface ITools {
  sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string
  ): Promise<{ toolResult: string; hash: string }>;
  verifyPayment(hash: string): Promise<boolean>;
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

  async sendPayment(
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
    try {
      if (!hash) {
        return false;
      }
      const receipt = await this.w3.eth.getTransactionReceipt(hash);
      return receipt.status === 1n;
    } catch (error: any) {
      return false;
    }
  }
}
