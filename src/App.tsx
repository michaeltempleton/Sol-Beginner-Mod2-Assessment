import './App.css';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import './App.css'

// import to fix polyfill issue with buffer with webpack
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;

type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
* @description gets Phantom provider, if it exists
*/
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

export default function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

  const [receiverPublicKey, setReceiverPublicKey] = useState<PublicKey | undefined>(
    undefined
  );

  const [senderKeypair, setSenderKeypair] = useState<Keypair | undefined>(
    undefined
  );

  const [balance, setBalance] = useState<number | undefined>(undefined);

  // const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  
  // connection to use with local solana test validator
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  useEffect(() => {
    const provider = getProvider();

    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  /**
   * @description creates a new KeyPair and airdrops 2 SOL into it.
   * This function is called when the Create a New Solana Account button is clicked
   */
  const createSender = async () => {
    const keypair = Keypair.generate();
    setSenderKeypair(keypair);

    const airdropSignature = await connection.requestAirdrop(
      keypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );

    try {
      await connection.confirmTransaction(airdropSignature);
    } catch (err) {
      console.error("Something went wrong: ", err);
      return;
    }
  
    try {
      const confirmedBalance = await connection.getBalance(keypair!.publicKey) / LAMPORTS_PER_SOL;
      setBalance(confirmedBalance);
    } catch (err) {
      console.error("Something went wrong: ", err)
    }
  }

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the Connect to Phantom Wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {
        const wallet = await solana.connect();
        setReceiverPublicKey(wallet.publicKey.toString());
      } catch (err) {
        console.error(err);
      }
    }
  };

  /**
   * @description disconnects wallet if it exists.
   * This function is called when the disconnect wallet button is clicked
   */
  const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;
    if (solana) {
      try {
        solana.disconnect();
        setReceiverPublicKey(undefined);
        console.log("wallet disconnected")
      } catch (err) {
        console.error(err);
      }
    }
  };

  /**
   * @description transfer SOL from sender wallet to connected wallet.
   * This function is called when the Transfer SOL to Phantom Wallet button is clicked
   */
  const transferSol = async () => {
    const transferTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair!.publicKey,
        toPubkey: receiverPublicKey!,
        lamports: LAMPORTS_PER_SOL 
      })
    );

    try {
      await sendAndConfirmTransaction(connection, transferTransaction, [senderKeypair!]);
      const senderBalance = await connection.getBalance(senderKeypair!.publicKey) / LAMPORTS_PER_SOL;
      setBalance(senderBalance)
    } catch (err) {
      console.error("Something went wrong: ", err)
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Module 2 Assessment</h2>
        {senderKeypair && <pre style={{fontSize: 14}}>
          Publickey: {senderKeypair.publicKey.toString()}{"\n"}
          Balance: {balance}
        </pre>}
        <span className ="buttons">
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createSender}
          >
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button
                style={{
                  fontSize: "16px",
                  padding: "15px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  position: "absolute",
                  top: "28px",
                  right: "28px"
                }}
                onClick={disconnectWallet}
              >
                Disconnect from Wallet
              </button>
            </div>
          )}
          {provider && receiverPublicKey && senderKeypair && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={transferSol}
          >
            Transfer SOL to Phantom Wallet
          </button>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}
