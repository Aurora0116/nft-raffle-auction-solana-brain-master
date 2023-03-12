import { useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as anchor from "@project-serum/anchor";
import { clusterApiUrl } from "@solana/web3.js";
import {
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletWallet,
  getSolletExtensionWallet,
} from "@solana/wallet-adapter-wallets";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import NotFound from "./pages/NotFound";
import Mint from "./pages/Mint";
import Page from "./components/Page";
import CreateRaffle from "./components/CreateRaffle";
import NewRaffle from "./components/NewRaffle";
import { ToastContainer } from 'react-toastify';
import RafflesPage from "./components/RafflesPage";
import RaffleItem from "./components/RaffleItem";

require("@solana/wallet-adapter-react-ui/styles.css");

const getCandyMachineId = () => {
  try {
    const candyMachineId = new anchor.web3.PublicKey(
      process.env.REACT_APP_CANDY_MACHINE_ID
    );

    return candyMachineId;
  } catch (e) {
    console.log("Failed to construct CandyMachineId", e);
    return undefined;
  }
};

const candyMachineId = getCandyMachineId();
const network = process.env.REACT_APP_SOLANA_NETWORK;
const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
const connection = new anchor.web3.Connection(
  rpcHost ? rpcHost : anchor.web3.clusterApiUrl("devnet")
);

const txTimeoutInMilliseconds = 30000;

const App = () => {
  const endpoint = useMemo(() => clusterApiUrl(network), []);

  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getSlopeWallet(),
      getSolletWallet({ network }),
      getSolletExtensionWallet({ network }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <Page>
                    <Mint
                      candyMachineId={candyMachineId}
                      connection={connection}
                      txTimeout={txTimeoutInMilliseconds}
                      rpcHost={rpcHost}
                    />
                  </Page>
                }
              />
              <Route
                path="/create-raffle"
                element={
                  <Page>
                    <CreateRaffle />
                  </Page>
                }
              />
              <Route
                path="/raffles"
                element={
                  <Page>
                    <RafflesPage />
                  </Page>
                }
              />
              <Route
                path="/new/:mint"
                element={
                  <Page>
                    <NewRaffle />
                  </Page>
                }
              />
              <Route
                path="/raffle/:mint"
                element={
                  <Page>
                    <RaffleItem />
                  </Page>
                }
              />
              <Route element={NotFound} />
            </Routes>
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
      <ToastContainer
        autoClose={5000}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </ConnectionProvider>
  );
};

export default App;
