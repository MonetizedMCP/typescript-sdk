import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';
import { Currency, CURRENCY_DETAILS } from './currency';
import { PaymentRail } from './payment-rail';

// ERC20 ABI for token transfers
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: '_to',
        type: 'address',
      },
      {
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    type: 'function',
  },
];

interface ITools {
  sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string,
    currency: Currency,
    paymentRail: PaymentRail
  ): Promise<{ resultMessage: string; hash: string }>;
  verifyPayment(
    hash: string,
    amount: number,
    currency: Currency,
    destinationWalletAddress: string,
    paymentRail: PaymentRail
  ): Promise<{ success: boolean; message: string }>;
}

const rpcUrls: { [key in PaymentRail]: string } = {
  [PaymentRail.BASE_SEPOLIA]: 'https://sepolia.base.org',
  [PaymentRail.BASE_MAINNET]: 'https://mainnet.base.org',
  [PaymentRail.ETHEREUM]: 'https://mainnet.infura.io/v3/',
  [PaymentRail.POLYGON]: 'https://polygon-rpc.com',
  [PaymentRail.ARBITRUM]: 'https://arb1.arbitrum.io/rpc',
  [PaymentRail.OPTIMISM]: 'https://mainnet.optimism.io'
};

export class PaymentsTools implements ITools {
  private w3: Web3;
  private localWalletPrivateKey: string;
  /**
   * Initializes the PaymentsTools class with Web3 instance and local wallet configuration.
   * Sets up the connection to Base Sepolia testnet and configures the wallet using the private key
   * from environment variables.
   */
  constructor() {
    this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrls[PaymentRail.BASE_SEPOLIA]));
    this.localWalletPrivateKey = process.env.LOCAL_WALLET_PRIVATE_KEY!;
    const localWallet = privateKeyToAccount(
      Uint8Array.from(Buffer.from(this.localWalletPrivateKey, 'hex'))
    );
    this.w3.eth.accounts.wallet.add(localWallet);
  }

  /**
   * Sends a payment transaction to a specified destination address.
   * Gas and gasPrice are dynamically calculated:
   * - For native token transfers: Uses standard 21000 gas
   * - For ERC20 token transfers: Estimates gas based on contract interaction
   * - GasPrice is obtained from the current network conditions
   * 
   * @param {number} amount - The amount to send
   * @param {string} destinationWalletAddress - The recipient's wallet address
   * @param {string} localWalletAddress - The sender's wallet address
   * @param {Currency} currency - The currency to send (ETH, USDC, etc.)
   * @param {PaymentRail} paymentRail - The payment rail to use for the transaction
   * @returns {Promise<{resultMessage: string, hash: string}>} An object containing:
   *   - resultMessage: A string describing the transaction result or error
   *   - hash: The transaction hash if successful, empty string if failed
   */
  async sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string,
    currency: Currency,
    paymentRail: PaymentRail
  ): Promise<{ resultMessage: string; hash: string }> {
    try {
      const rpcUrl = rpcUrls[paymentRail];
      this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

      const currencyDetails = CURRENCY_DETAILS[currency];
      const amountWei = BigInt(Math.floor(amount * (10 ** currencyDetails.decimals)));

      // Get the current nonce and pending transactions
      const currentNonce = await this.w3.eth.getTransactionCount(localWalletAddress, 'latest');
      const pendingNonce = await this.w3.eth.getTransactionCount(localWalletAddress, 'pending');
      
      // Use the higher nonce to account for pending transactions
      const nonce = Math.max(Number(currentNonce), Number(pendingNonce));
      
      const gasPrice = await this.w3.eth.getGasPrice();

      if (currencyDetails.isNative) {
        // For native token transfers, use standard gas limit
        const tx = {
          from: localWalletAddress,
          to: destinationWalletAddress,
          gas: '21000', // Standard gas limit for native token transfers
          gasPrice: gasPrice.toString(),
          nonce: nonce.toString(),
          value: amountWei.toString(),
        };

        const signedTx = await this.w3.eth.accounts.signTransaction(
          tx,
          this.localWalletPrivateKey
        );

        try {
          const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);
          return {
            resultMessage: `Transaction sent: ${receipt.transactionHash}`,
            hash: receipt.transactionHash.toString(),
          };
        } catch (error: any) {
          if (error.message.includes('nonce too low')) {
            // If nonce is too low, retry with the latest nonce
            const latestNonce = await this.w3.eth.getTransactionCount(localWalletAddress, 'latest');
            tx.nonce = latestNonce.toString();
            const retrySignedTx = await this.w3.eth.accounts.signTransaction(tx, this.localWalletPrivateKey);
            const retryReceipt = await this.w3.eth.sendSignedTransaction(retrySignedTx.rawTransaction!);
            return {
              resultMessage: `Transaction sent after nonce retry: ${retryReceipt.transactionHash}`,
              hash: retryReceipt.transactionHash.toString(),
            };
          }
          throw error;
        }
      } else {
        if (!currencyDetails.address) {
          return { resultMessage: 'Token contract address not found', hash: '' };
        }

        const tokenContract = new this.w3.eth.Contract(ERC20_ABI, currencyDetails.address);
        const data = tokenContract.methods
          .transfer(destinationWalletAddress, amountWei.toString())
          .encodeABI();

        // Estimate gas for ERC20 token transfer
        const estimatedGas = await this.w3.eth.estimateGas({
          from: localWalletAddress,
          to: currencyDetails.address,
          data: data,
        });

        const tx = {
          from: localWalletAddress,
          to: currencyDetails.address,
          gas: estimatedGas.toString(),
          gasPrice: gasPrice.toString(),
          nonce: nonce.toString(),
          data: data,
        };

        const signedTx = await this.w3.eth.accounts.signTransaction(
          tx,
          this.localWalletPrivateKey
        );

        try {
          const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);
          return {
            resultMessage: `Token transfer sent: ${receipt.transactionHash}`,
            hash: receipt.transactionHash.toString(),
          };
        } catch (error: any) {
          if (error.message.includes('nonce too low')) {
            // If nonce is too low, retry with the latest nonce
            const latestNonce = await this.w3.eth.getTransactionCount(localWalletAddress, 'latest');
            tx.nonce = latestNonce.toString();
            const retrySignedTx = await this.w3.eth.accounts.signTransaction(tx, this.localWalletPrivateKey);
            const retryReceipt = await this.w3.eth.sendSignedTransaction(retrySignedTx.rawTransaction!);
            return {
              resultMessage: `Token transfer sent after nonce retry: ${retryReceipt.transactionHash}`,
              hash: retryReceipt.transactionHash.toString(),
            };
          }
          throw error;
        }
      }
    } catch (error: any) {
      return { resultMessage: 'Error: ' + error.message, hash: '' };
    }
  }

  /**
   * Verifies if a payment transaction was successful by checking its status and amount on the specified payment rail.
   * @param {string} hash - The transaction hash to verify
   * @param {number} amount - The expected amount that should have been transferred
   * @param {Currency} currency - The currency that should have been transferred
   * @param {string} destinationWalletAddress - The address that should have received the payment
   * @param {PaymentRail} paymentRail - The payment rail where the transaction was made
   * @returns {Promise<{success: boolean, message: string}>} An object containing:
   *   - success: Whether the verification was successful
   *   - message: A description of the verification result
   */
  async verifyPayment(
    hash: string,
    amount: number,
    currency: Currency,
    destinationWalletAddress: string,
    paymentRail: PaymentRail
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!hash) {
        return { success: false, message: 'No transaction hash provided' };
      }

      // Connect to the correct payment rail
      const rpcUrl = rpcUrls[paymentRail];
      this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

      const receipt = await this.w3.eth.getTransactionReceipt(hash);
      if (!receipt) {
        return { success: false, message: 'Transaction not found' };
      }

      if (receipt.status !== 1n) {
        return { success: false, message: 'Transaction failed' };
      }

      const currencyDetails = CURRENCY_DETAILS[currency];
      const expectedAmount = BigInt(Math.floor(amount * 10 ** currencyDetails.decimals));

      if (currencyDetails.isNative) {
        const transaction = await this.w3.eth.getTransaction(hash);
        if (transaction.to?.toLowerCase() !== destinationWalletAddress.toLowerCase()) {
          return { success: false, message: 'Incorrect destination address' };
        }

        if (BigInt(transaction.value) !== expectedAmount) {
          return { success: false, message: 'Incorrect amount transferred' };
        }

        return { success: true, message: 'Payment verified successfully' };
      } else {
        if (!currencyDetails.address) {
          return { success: false, message: 'Token contract address not found' };
        }

        const tokenContract = new this.w3.eth.Contract(ERC20_ABI, currencyDetails.address);
        const transferEvents = await tokenContract.getPastEvents('allEvents', {
          fromBlock: receipt.blockNumber,
          toBlock: receipt.blockNumber,
          filter: {
            _to: destinationWalletAddress,
            _value: expectedAmount.toString(),
          },
        });

        if (transferEvents.length === 0) {
          return { success: false, message: 'Token transfer event not found' };
        }

        return { success: true, message: 'Token transfer verified successfully' };
      }
    } catch (error: any) {
      return { success: false, message: 'Error verifying payment: ' + error.message };
    }
  }
}
