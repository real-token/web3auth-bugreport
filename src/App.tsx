import { useEffect, useState } from "react";
import { Web3AuthNoModal } from "@web3auth/no-modal";
import {
  CHAIN_NAMESPACES,
  SafeEventEmitterProvider,
  WALLET_ADAPTERS,
} from "@web3auth/base";
import { AuthAdapter, AuthLoginParams } from "@web3auth/auth-adapter";
import { CoinbaseAdapter } from "@web3auth/coinbase-adapter";
import {
  WalletConnectV2Adapter,
  getWalletConnectV2Settings,
} from "@web3auth/wallet-connect-v2-adapter";
import { WalletConnectModal } from "@walletconnect/modal";

import "./App.css";
import RPC from "./web3RPC"; // for using web3.js
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

const clientId =
  "BHgArYmWwSeq21czpcarYh0EVq2WWOzflX-NTK-tY1-1pauPzHKRRLgpABkmYiIV_og9jAvoIxQ8L3Smrwe04Lw"; // get from https://dashboard.web3auth.io

function App() {
  const [web3auth, setWeb3auth] = useState<Web3AuthNoModal | null>(null);
  const [isReady, setIsReady] = useState<'yes' | 'no'>('no')
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(
    null
  );
  const [logBox, setLogBox] = useState<string>('') 
  const [startTime, setStartTime] = useState<number | undefined>(undefined)

  useEffect(() => {
    const readyListener = () => {
      setIsReady('yes')
      if (startTime) {
        const timeUserCantDoNothing = Math.floor((+new Date() - startTime) / 1000)
        setLogBox(`user couldn't login for ${timeUserCantDoNothing} seconds!`)
      }
    }

    web3auth?.addListener('errored', readyListener)
    web3auth?.addListener('ready', readyListener)
    return () => {
      web3auth?.removeListener('errored', readyListener)
      web3auth?.removeListener('ready', readyListener)
    }
  }, [web3auth, startTime])
  useEffect(() => {
    const init = async () => {
      try {
        const chainConfig = {
          displayName: "Ethereum Mainnet",
          chainId: "0x1",
          rpcTarget: "https://rpc.ankr.com/eth",
          blockExplorerUrl: "https://etherscan.io/",
          ticker: "ETH",
          tickerName: "Ethereum",
          logo: "https://images.toruswallet.io/eth.svg",
          chainNamespace: CHAIN_NAMESPACES.EIP155,
        };
        const privateKeyProvider = new EthereumPrivateKeyProvider({
          config: { chainConfig },
        });

        const web3auth = new Web3AuthNoModal({
          clientId,
          web3AuthNetwork: "sapphire_devnet",
          privateKeyProvider,
          enableLogging: true,
        });

        setWeb3auth(web3auth);

        const coinbase = new CoinbaseAdapter();
        const authAdapter = new AuthAdapter();
        web3auth.configureAdapter(authAdapter);

        // Configure this project id on Web3Auth Dashboard for the project you put the client id of
        const defaultWcSettings = await getWalletConnectV2Settings(
          CHAIN_NAMESPACES.EIP155,
          ["0x1", "0xaa36a7"],
          "04309ed1007e77d1f119b85205bb779d"
        );
        const walletConnectModal = new WalletConnectModal({
          projectId: "04309ed1007e77d1f119b85205bb779d",
        });
        const wcAdapter = new WalletConnectV2Adapter({
          adapterSettings: {
            qrcodeModal: walletConnectModal,
            ...defaultWcSettings.adapterSettings,
          },
          loginSettings: { ...defaultWcSettings.loginSettings },
        });
        web3auth.configureAdapter(wcAdapter);

        web3auth.configureAdapter(coinbase);

        await web3auth.init();
        if (web3auth.connectedAdapterName && web3auth.provider) {
          setProvider(web3auth.provider);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
      setIsReady('no')
      setStartTime(+new Date())
      try {
        const web3authProvider = await web3auth.connectTo<AuthLoginParams>(
          WALLET_ADAPTERS.AUTH,
          { loginProvider: "google" }
        );
        setProvider(web3authProvider);
      }
      catch (e) {
        console.error(e)
      }
  };

  const loginCoinbase = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const web3authProvider = await web3auth.connectTo<void>(
      WALLET_ADAPTERS.COINBASE
    );
    setProvider(web3authProvider);
  };

  const loginWalletConnect = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    if (web3auth.status === "ready") {
      const web3authProvider = await web3auth.connectTo(
        WALLET_ADAPTERS.WALLET_CONNECT_V2
      );
      setProvider(web3authProvider);
    }
  };

  const authenticateUser = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const idToken = await web3auth.authenticateUser();
    uiConsole(idToken);
  };

  const getUserInfo = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    const user = await web3auth.getUserInfo();
    uiConsole(user);
  };

  const logout = async () => {
    if (!web3auth) {
      uiConsole("web3auth not initialized yet");
      return;
    }
    await web3auth.logout();
    setProvider(null);
  };

  const getChainId = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const chainId = await rpc.getChainId();
    uiConsole(chainId);
  };

  const addChain = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const newChain = {
      chainId: "0x5",
      displayName: "Goerli",
      chainNamespace: CHAIN_NAMESPACES.EIP155,
      tickerName: "Goerli",
      ticker: "ETH",
      decimals: 18,
      rpcTarget: "https://rpc.ankr.com/eth_goerli",
      blockExplorer: "https://goerli.etherscan.io",
    };
    await web3auth?.addChain(newChain);
    uiConsole("New Chain Added");
  };

  const switchChain = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    await web3auth?.switchChain({ chainId: "0x5" });
    uiConsole("Chain Switched");
  };

  const getAccounts = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const address = await rpc.getAccounts();
    uiConsole(address);
  };

  const getBalance = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const balance = await rpc.getBalance();
    uiConsole(balance);
  };

  const sendTransaction = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const receipt = await rpc.sendTransaction();
    uiConsole(receipt);
  };

  const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const signedMessage = await rpc.signMessage();
    uiConsole(signedMessage);
  };

  const getPrivateKey = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    const rpc = new RPC(provider);
    const privateKey = await rpc.getPrivateKey();
    uiConsole(privateKey);
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(
        args || {},
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      );
    }
  }

  const loggedInView = (
    <>
      <div className="flex-container">
      <div>{logBox}</div>
      <div>`Is web3auth ready? `{isReady}</div>
        <div>
          <button onClick={getUserInfo} className="card">
            Get User Info
          </button>
        </div>
        <div>
          <button onClick={authenticateUser} className="card">
            Get ID Token
          </button>
        </div>
        <div>
          <button onClick={getChainId} className="card">
            Get Chain ID
          </button>
        </div>
        <div>
          <button onClick={addChain} className="card">
            Add Chain
          </button>
        </div>
        <div>
          <button onClick={switchChain} className="card">
            Switch Chain
          </button>
        </div>
        <div>
          <button onClick={getAccounts} className="card">
            Get Accounts
          </button>
        </div>
        <div>
          <button onClick={getBalance} className="card">
            Get Balance
          </button>
        </div>
        <div>
          <button onClick={signMessage} className="card">
            Sign Message
          </button>
        </div>
        <div>
          <button onClick={sendTransaction} className="card">
            Send Transaction
          </button>
        </div>
        <div>
          <button onClick={getPrivateKey} className="card">
            Get Private Key
          </button>
        </div>
        <div>
          <button onClick={logout} className="card">
            Log Out
          </button>
        </div>
      </div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}>Logged in Successfully!</p>
      </div>
    </>
  );

  const unloggedInView = (
    <>
      <button onClick={login} className="card">
        Login
      </button>
      <button onClick={loginCoinbase} className="card">
        Login coinbase
      </button>
      <button onClick={loginWalletConnect} className="card">
        Login walletconnect
      </button>
      <div>{logBox}</div>
      <div>`Is web3auth ready? `{isReady}</div>
    </>
  );

  return (
    <div className="container">
      <h1 className="title">
        <a target="_blank" href="http://web3auth.io/" rel="noreferrer">
          Web3Auth{" "}
        </a>
        & ReactJS Example
      </h1>

      <div className="grid">
        {web3auth?.connected ? loggedInView : unloggedInView}
      </div>

      <footer className="footer">
        <a
          href="https://github.com/Web3Auth/examples/tree/master/web-no-modal-sdk/evm/react-evm-no-modal-example"
          target="_blank"
          rel="noopener noreferrer">
          Source code
        </a>
      </footer>
    </div>
  );
}

export default App;
