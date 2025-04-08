import { Web3 } from 'web3';
import { privateKeyToAccount } from 'web3-eth-accounts';
import { Currency, CURRENCY_DETAILS } from './currency';

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
    chain?: string
  ): Promise<{ resultMessage: string; hash: string }>;
  verifyPayment(
    hash: string,
    amount: number,
    currency: Currency,
    destinationWalletAddress: string
  ): Promise<{ success: boolean; message: string }>;
}

const rpcUrls: { [key: string]: string } = {
  'base-sepolia': 'https://sepolia.base.org',
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
   * @param {string} localWalletAddress - The sender's wallet address
   * @param {Currency} currency - The currency to send (ETH, USDC, etc.)
   * @param {string} chain - The blockchain network to use (default: 'base-sepolia')
   * @returns {Promise<{resultMessage: string, hash: string}>} An object containing:
   *   - resultMessage: A string describing the transaction result or error
   *   - hash: The transaction hash if successful, empty string if failed
   */
  async sendPayment(
    amount: number,
    destinationWalletAddress: string,
    localWalletAddress: string,
    currency: Currency,
    chain: string = 'base-sepolia'
  ): Promise<{ resultMessage: string; hash: string }> {
    try {
      const rpcUrl = rpcUrls[chain] || rpcUrls['base-sepolia'];
      this.w3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

      const currencyDetails = CURRENCY_DETAILS[currency];
      const amountWei = BigInt(Math.floor(amount * 10 ** currencyDetails.decimals));

      const nonce = await this.w3.eth.getTransactionCount(localWalletAddress);
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
        const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);

        return {
          resultMessage: `Transaction sent: ${receipt.transactionHash}`,
          hash: receipt.transactionHash.toString(),
        };
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
        const receipt = await this.w3.eth.sendSignedTransaction(signedTx.rawTransaction!);

        return {
          resultMessage: `Token transfer sent: ${receipt.transactionHash}`,
          hash: receipt.transactionHash.toString(),
        };
      }
    } catch (error: any) {
      return { resultMessage: 'Error: ' + error.message, hash: '' };
    }
  }

  /**
   * Verifies if a payment transaction was successful by checking its status and amount on the blockchain.
   * @param {string} hash - The transaction hash to verify
   * @param {number} amount - The expected amount that should have been transferred
   * @param {Currency} currency - The currency that should have been transferred
   * @param {string} destinationWalletAddress - The address that should have received the payment
   * @returns {Promise<{success: boolean, message: string}>} An object containing:
   *   - success: Whether the verification was successful
   *   - message: A description of the verification result
   */
  async verifyPayment(
    hash: string,
    amount: number,
    currency: Currency,
    destinationWalletAddress: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!hash) {
        return { success: false, message: 'No transaction hash provided' };
      }

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
