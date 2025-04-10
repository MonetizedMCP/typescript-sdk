import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';
import { Currency, CURRENCY_DETAILS } from './currency';
import { PaymentMethod } from './payment-method';

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
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
];

interface ITools {
  sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string,
    paymentMethod: PaymentMethod
  ): Promise<{ resultMessage: string; hash: string }>;
  verifyPayment(
    hash: string,
    amount: number,
    paymentMethod: PaymentMethod,
    destinationWalletAddress: string
  ): Promise<{ success: boolean; message: string }>;
}

// RPC URLs for different chains
const rpcUrls: { [key: string]: string } = {
  'base-sepolia': 'https://sepolia.base.org',
  'base-mainnet': 'https://mainnet.base.org',
  solana: 'https://api.devnet.solana.com',
};

// Mapping of payment methods to their respective chains
const paymentMethodToChain: { [key in PaymentMethod]: string } = {
  [PaymentMethod.ETH_BASE_SEPOLIA]: 'base-sepolia',
  [PaymentMethod.USDC_BASE_SEPOLIA]: 'base-sepolia',
  [PaymentMethod.USDT_BASE_SEPOLIA]: 'base-sepolia',
  [PaymentMethod.ETH_BASE_MAINNET]: 'base-mainnet',
  [PaymentMethod.USDC_BASE_MAINNET]: 'base-mainnet',
  [PaymentMethod.USDT_BASE_MAINNET]: 'base-mainnet',
  [PaymentMethod.SOL_SOLANA]: 'solana',
  [PaymentMethod.USDC_SOLANA]: 'solana',
  [PaymentMethod.USDT_SOLANA]: 'solana',
};

// Mapping of payment methods to their respective currencies
const paymentMethodToCurrency: { [key in PaymentMethod]: Currency } = {
  [PaymentMethod.ETH_BASE_SEPOLIA]: Currency.ETH,
  [PaymentMethod.USDC_BASE_SEPOLIA]: Currency.USDC,
  [PaymentMethod.USDT_BASE_SEPOLIA]: Currency.USDT,
  [PaymentMethod.ETH_BASE_MAINNET]: Currency.ETH,
  [PaymentMethod.USDC_BASE_MAINNET]: Currency.USDC,
  [PaymentMethod.USDT_BASE_MAINNET]: Currency.USDT,
  [PaymentMethod.SOL_SOLANA]: Currency.SOL,
  [PaymentMethod.USDC_SOLANA]: Currency.USDC,
  [PaymentMethod.USDT_SOLANA]: Currency.USDT,
};

export class PaymentsTools implements ITools {
  private w3: Web3;
  private localWalletPrivateKey: string;

  constructor() {
    this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrls['base-sepolia']));
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
   * @param {PaymentMethod} paymentMethod - The payment method to use (e.g., USDC_BASE_SEPOLIA)
   * @returns {Promise<{resultMessage: string, hash: string}>} An object containing:
   *   - resultMessage: A string describing the transaction result or error
   *   - hash: The transaction hash if successful, empty string if failed
   */
  async sendPayment(
    amount: number,
    destinationWalletAddress: string,
    paymentMethod: PaymentMethod
  ): Promise<{ resultMessage: string; hash: string }> {
    try {
      const chain = paymentMethodToChain[paymentMethod];
      const currency = paymentMethodToCurrency[paymentMethod];

      // Connect to the appropriate chain
      const rpcUrl = rpcUrls[chain];
      this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
      const localWallet = privateKeyToAccount(
        Uint8Array.from(Buffer.from(this.localWalletPrivateKey, 'hex'))
      );
      this.w3.eth.accounts.wallet.add(localWallet);

      const currencyDetails = CURRENCY_DETAILS[currency];
      const amountWei = BigInt(Math.floor(amount * 10 ** currencyDetails.decimals));

      const nonce = await this.w3.eth.getTransactionCount(localWallet.address);

      const gasPrice = await this.w3.eth.getGasPrice();

      if (currencyDetails.isNative) {
        // For native token transfers, use standard gas limit
        const tx = {
          from: localWallet.address,
          to: destinationWalletAddress,
          gas: '21000', // Standard gas limit for native token transfers
          gasPrice: gasPrice.toString(),
          nonce: nonce.toString(),
          value: amountWei.toString(),
        };

        const signedTx = await this.w3.eth.accounts.signTransaction(tx, this.localWalletPrivateKey);

        try {
          const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);
          return {
            resultMessage: `Transaction sent: ${receipt.transactionHash}`,
            hash: receipt.transactionHash.toString(),
          };
        } catch (error: any) {
          if (error.message.includes('nonce too low')) {
            // Extract the next nonce from the error message
            // Format: "nonce too low: next nonce X, tx nonce Y"
            const nextNonceMatch = error.message.match(/next nonce (\d+)/);
            if (nextNonceMatch && nextNonceMatch[1]) {
              const nextNonce = parseInt(nextNonceMatch[1], 10);
              tx.nonce = nextNonce.toString();
              const retrySignedTx = await this.w3.eth.accounts.signTransaction(
                tx,
                this.localWalletPrivateKey
              );
              const retryReceipt = await this.w3.eth.sendSignedTransaction(
                retrySignedTx.rawTransaction!
              );
              return {
                resultMessage: `Transaction sent after nonce retry: ${retryReceipt.transactionHash}`,
                hash: retryReceipt.transactionHash.toString(),
              };
            }
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
          from: localWallet.address,
          to: currencyDetails.address,
          data: data,
        });

        const tx = {
          from: localWallet.address,
          to: currencyDetails.address,
          gas: estimatedGas.toString(),
          gasPrice: gasPrice.toString(),
          nonce: nonce.toString(),
          data: data,
        };

        const signedTx = await this.w3.eth.accounts.signTransaction(tx, this.localWalletPrivateKey);

        try {
          const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);
          return {
            resultMessage: `Token transfer sent: ${receipt.transactionHash}`,
            hash: receipt.transactionHash.toString(),
          };
        } catch (error: any) {
          if (error.message.includes('nonce too low')) {
            // Extract the next nonce from the error message
            // Format: "nonce too low: next nonce X, tx nonce Y"
            const nextNonceMatch = error.message.match(/next nonce (\d+)/);
            if (nextNonceMatch && nextNonceMatch[1]) {
              const nextNonce = parseInt(nextNonceMatch[1], 10);
              tx.nonce = nextNonce.toString();
              const retrySignedTx = await this.w3.eth.accounts.signTransaction(
                tx,
                this.localWalletPrivateKey
              );
              const retryReceipt = await this.w3.eth.sendSignedTransaction(
                retrySignedTx.rawTransaction!
              );
              return {
                resultMessage: `Token transfer sent after nonce retry: ${retryReceipt.transactionHash}`,
                hash: retryReceipt.transactionHash.toString(),
              };
            }
          }
          throw error;
        }
      }
    } catch (error: any) {
      return { resultMessage: 'Error: ' + error.message, hash: '' };
    }
  }

  /**
   * Verifies if a payment transaction was successful by checking its status and amount on the specified chain.
   * @param {string} hash - The transaction hash to verify
   * @param {number} amount - The expected amount that should have been transferred
   * @param {PaymentMethod} paymentMethod - The payment method used for the transaction
   * @param {string} destinationWalletAddress - The address that should have received the payment
   * @returns {Promise<{success: boolean, message: string}>} An object containing:
   *   - success: Whether the verification was successful
   *   - message: A description of the verification result
   */
  async verifyPayment(
    hash: string,
    amount: number,
    paymentMethod: PaymentMethod,
    destinationWalletAddress: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!hash) {
        return { success: false, message: 'No transaction hash provided' };
      }

      const chain = paymentMethodToChain[paymentMethod];
      const currency = paymentMethodToCurrency[paymentMethod];

      // Connect to the appropriate chain
      const rpcUrl = rpcUrls[chain];
      this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

      const receipt = await this.w3.eth.getTransactionReceipt(hash);
      if (!receipt) {
        return { success: false, message: 'Transaction not found' };
      }

      if (receipt.status !== 1n) {
        return { success: false, message: 'Transaction failed' };
      }

      const currencyDetails = CURRENCY_DETAILS[currency];
      const expectedAmount = BigInt(Math.floor(amount * (10 ** currencyDetails.decimals)));

      const transaction = await this.w3.eth.getTransaction(hash);
      
      if (!transaction) {
        return { success: false, message: 'Transaction not found' };
      }

      if (currencyDetails.isNative) {
        // For native token transfers, verify the recipient and amount directly
        if (transaction.to?.toLowerCase() !== destinationWalletAddress.toLowerCase()) {
          return { 
            success: false, 
            message: `Incorrect destination address. Expected: ${destinationWalletAddress.toLowerCase()}, Got: ${transaction.to?.toLowerCase()}` 
          };
        }

        if (BigInt(transaction.value) !== expectedAmount) {
          return { 
            success: false, 
            message: `Incorrect amount transferred. Expected: ${expectedAmount}, Got: ${transaction.value}` 
          };
        }
      } else {
        // For token transfers, verify the token contract and decode the transfer data
        if (!currencyDetails.address) {
          return { success: false, message: 'Token contract address not found' };
        }

        if (transaction.to?.toLowerCase() !== currencyDetails.address.toLowerCase()) {
          return { 
            success: false, 
            message: `Transaction not sent to token contract. Expected: ${currencyDetails.address.toLowerCase()}, Got: ${transaction.to?.toLowerCase()}` 
          };
        }

        // Decode the transaction input data to verify the token transfer details
        const tokenContract = new this.w3.eth.Contract(ERC20_ABI, currencyDetails.address);
        const decodedInput = tokenContract.methods.transfer(destinationWalletAddress, expectedAmount.toString()).encodeABI();
        
        if (transaction.input.toLowerCase() !== decodedInput.toLowerCase()) {
          return { 
            success: false, 
            message: 'Token transfer data does not match expected values' 
          };
        }
      }

      return {
        success: true,
        message: 'Payment verified successfully'
      };
    } catch (error: any) {
      return { success: false, message: 'Error verifying payment: ' + error.message };
    }
  }
}
