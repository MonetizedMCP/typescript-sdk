import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';

interface ITools {
  sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string
  ): Promise<{ resultMessage: string; hash: string }>;
  verifyPayment(hash: string): Promise<boolean>;
}

export class PaymentsTools implements ITools {
  private w3: Web3;
  private localWalletAddress: string;

  /**
   * Initializes the PaymentsTools class with Web3 instance and local wallet configuration.
   * Sets up the connection to Base Sepolia testnet and configures the wallet using the private key
   * from environment variables.
   */
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

  /**
   * Sends a payment transaction to a specified destination address.
   * @param {number} amount - The amount to send in ETH
   * @param {string} destinationWalletAddress - The recipient's wallet address
   * @param {string} localWalletAddress - The sender's wallet address
   * @returns {Promise<{resultMessage: string, hash: string}>} An object containing:
   *   - resultMessage: A string describing the transaction result or error
   *   - hash: The transaction hash if successful, empty string if failed
   */
  async sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string
  ): Promise<{ resultMessage: string; hash: string }> {
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
        resultMessage: `Transaction sent: ${receipt.transactionHash}`,
        hash: receipt.transactionHash.toString(),
      };
    } catch (error: any) {
      return { resultMessage: 'Error: ' + error.message, hash: '' };
    }
  }

  /**
   * Verifies if a payment transaction was successful by checking its status on the blockchain.
   * @param {string} hash - The transaction hash to verify
   * @returns {Promise<boolean>} True if the transaction was successful, false otherwise
   */
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
