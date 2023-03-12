import { useEffect, useMemo, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletModalButton } from "@solana/wallet-adapter-react-ui";
import {
  awaitTransactionSignatureConfirmation,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from "./../../utils/candy-machine";
import {
  toDate,
  getAtaForMint,
} from "./../../utils/utils";
import { MintCountdown } from "./MintCountdown";
import { MintButton } from "./MintButton";
import { GatewayProvider } from "@civic/solana-gateway-react";
import { sendTransaction } from "./../../utils/connection";

import "./Claim.css";

const UNIT_PRICE = 1;

const Claim = (props) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState();
  // eslint-disable-next-line
  const [alertState, setAlertState] = useState({
    open: false,
    message: "",
    severity: undefined,
  });
  const [isActive, setIsActive] = useState(false);
  const [endDate, setEndDate] = useState();
  const [itemsRemaining, setItemsRemaining] = useState();
  const [isWhitelistUser, setIsWhitelistUser] = useState(false);
  const [isPresale, setIsPresale] = useState(false);
  // eslint-disable-next-line
  const [discountPrice, setDiscountPrice] = useState();

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    };
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) {
      return;
    }

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection
        );
        let active =
          cndy?.state.goLiveDate?.toNumber() < new Date().getTime() / 1000;
        let presale = false;
        // whitelist mint?
        if (cndy?.state.whitelistMintSettings) {
          // is it a presale mint?
          if (
            cndy.state.whitelistMintSettings.presale &&
            (!cndy.state.goLiveDate ||
              cndy.state.goLiveDate.toNumber() > new Date().getTime() / 1000)
          ) {
            presale = true;
          }
          // is there a discount?
          if (cndy.state.whitelistMintSettings.discountPrice) {
            setDiscountPrice(cndy.state.whitelistMintSettings.discountPrice);
          } else {
            setDiscountPrice(undefined);
            // when presale=false and discountPrice=null, mint is restricted
            // to whitelist users only
            if (!cndy.state.whitelistMintSettings.presale) {
              cndy.state.isWhitelistOnly = true;
            }
          }
          // retrieves the whitelist token
          const mint = new anchor.web3.PublicKey(
            cndy.state.whitelistMintSettings.mint
          );
          const token = (await getAtaForMint(mint, anchorWallet.publicKey))[0];

          try {
            const balance = await props.connection.getTokenAccountBalance(
              token
            );
            let valid = parseInt(balance.value.amount) > 0;
            // only whitelist the user if the balance > 0
            setIsWhitelistUser(valid);
            active = (presale && valid) || active;
          } catch (e) {
            setIsWhitelistUser(false);
            // no whitelist user, no mint
            if (cndy.state.isWhitelistOnly) {
              active = false;
            }
            console.log("There was a problem fetching whitelist token balance");
            console.log(e);
          }
        }
        // datetime to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.date) {
          setEndDate(toDate(cndy.state.endSettings.number));
          if (
            cndy.state.endSettings.number.toNumber() <
            new Date().getTime() / 1000
          ) {
            active = false;
          }
        }
        // amount to stop the mint?
        if (cndy?.state.endSettings?.endSettingType.amount) {
          let limit = Math.min(
            cndy.state.endSettings.number.toNumber(),
            cndy.state.itemsAvailable
          );
          if (cndy.state.itemsRedeemed < limit) {
            setItemsRemaining(limit - cndy.state.itemsRedeemed);
          } else {
            setItemsRemaining(0);
            cndy.state.isSoldOut = true;
          }
        } else {
          setItemsRemaining(cndy.state.itemsRemaining);
        }

        if (cndy.state.isSoldOut) {
          active = false;
        }

        setIsActive((cndy.state.isActive = active));
        setIsPresale((cndy.state.isPresale = presale));
        setCandyMachine(cndy);
      } catch (e) {
        console.log("There was a problem fetching Candy Machine state");
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const onMint = async (beforeTransactions, afterTransactions) => {
    try {
      setIsUserMinting(true);
      document.getElementById("#identity")?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        let mintOne = await mintOneToken(
          candyMachine,
          wallet.publicKey,
          beforeTransactions,
          afterTransactions
        );

        const mintTxId = mintOne[0];

        let status = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true
          );
        }

        if (status && !status.err) {
          // manual update since the refresh might not detect
          // the change immediately
          let remaining = itemsRemaining - 1;
          setItemsRemaining(remaining);
          setIsActive((candyMachine.state.isActive = remaining > 0));
          candyMachine.state.isSoldOut = remaining === 0;
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error) {
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (!error.message) {
          message = "Transaction Timeout! Please try again.";
        } else if (error.message.indexOf("0x137")) {
          console.log(error);
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          console.log(error);
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
      // updates the candy machine state to reflect the lastest
      // information on chain
      refreshCandyMachineState();
    } finally {
      setIsUserMinting(false);
    }
  };

  const toggleMintButton = () => {
    let active = !isActive || isPresale;

    if (active) {
      if (candyMachine.state.isWhitelistOnly && !isWhitelistUser) {
        active = false;
      }
      if (endDate && Date.now() >= endDate.getTime()) {
        active = false;
      }
    }

    if (
      isPresale &&
      candyMachine.state.goLiveDate &&
      candyMachine.state.goLiveDate.toNumber() <= new Date().getTime() / 1000
    ) {
      setIsPresale((candyMachine.state.isPresale = false));
    }

    setIsActive((candyMachine.state.isActive = active));
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  return (
    <div className="mint-container">
      <div className="h-12"></div>

      <div id="mint">
        <div id="mint-gif-container">
          {/* <video
            id="mint-gif"
            autoPlay="autoplay"
            loop
            muted
            playsInline
            width={100}
          >
            <source src="/assets/mint.webm" type="video/webm" />
            <source src="/assets/mint.mp4" type="video/mp4" />
          </video> */}
        </div>

        <div id="claim-text-wrapper">
          <div id="payment-modal">
            <div id="payment-header">
              <div id="payment-header-text">
                <h4>CLAIM YOUR GENESIS PASS</h4>
                <p>
                  This Genesis Pass will allow its holder WL to all future
                  Solana SOL Flower mints as well as random original art
                  airdrops
                </p>
                <p className="italic-grey">Total supply: 420 NFTs</p>
              </div>
            </div>

            <div id="payment-info">
              {/* <video
                id="price-img"
                autoPlay="autoplay"
                loop
                muted
                playsInline
                width={100}
              >
                <source src="/assets/mint.webm" type="video/webm" />
                <source src="/assets/mint.mp4" type="video/mp4" />
              </video> */}

              <div id="payment-info-text">
                <p>Price Per Genesis Pass</p>
                <h5>{UNIT_PRICE} SOL + 5000 FLWR</h5>
                <p>LIVE NOW!</p>
              </div>
            </div>

            <div id="ape-total">
              <p>Total</p>
              <h5>{UNIT_PRICE} SOL + 5000 FLWR</h5>
            </div>

            {!wallet.connected ? (
              <WalletModalButton className="purchase-button">
                Connect Wallet
              </WalletModalButton>
            ) : (
              <>
                {candyMachine && (
                  <>
                    {isActive && endDate && Date.now() < endDate.getTime() ? (
                      <>
                        <MintCountdown
                          key="endSettings"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: "flex-end" }}
                          status="COMPLETED"
                          onComplete={toggleMintButton}
                        />
                      </>
                    ) : (
                      <>
                        <MintCountdown
                          key="goLive"
                          date={getCountdownDate(candyMachine)}
                          style={{ justifyContent: "flex-end" }}
                          status={
                            candyMachine?.state?.isSoldOut ||
                              (endDate && Date.now() > endDate.getTime())
                              ? "COMPLETED"
                              : isPresale
                                ? "PRESALE"
                                : "LIVE"
                          }
                          onComplete={toggleMintButton}
                        />
                      </>
                    )}
                  </>
                )}

                <div>
                  {candyMachine?.state.isActive &&
                    candyMachine?.state.gatekeeper &&
                    wallet.publicKey &&
                    wallet.signTransaction ? (
                    <GatewayProvider
                      wallet={{
                        publicKey:
                          wallet.publicKey ||
                          new PublicKey(CANDY_MACHINE_PROGRAM),
                        //@ts-ignore
                        signTransaction: wallet.signTransaction,
                      }}
                      gatekeeperNetwork={
                        candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                      }
                      clusterUrl={rpcUrl}
                      handleTransaction={async (transaction) => {
                        setIsUserMinting(true);
                        const userMustSign = transaction.signatures.find(
                          (sig) => sig.publicKey.equals(wallet.publicKey)
                        );
                        if (userMustSign) {
                          toast("Please sign one-time Civic Pass issuance");
                          try {
                            transaction = await wallet.signTransaction(
                              transaction
                            );
                          } catch (e) {
                            toast.error("User cancelled signing");
                            // setTimeout(() => window.location.reload(), 2000);
                            setIsUserMinting(false);
                            throw e;
                          }
                        } else {
                          toast("Refreshing Civic Pass");
                        }
                        try {
                          await sendTransaction(
                            props.connection,
                            wallet,
                            transaction,
                            [],
                            true,
                            "confirmed"
                          );
                          toast("Please sign minting");
                        } catch (e) {
                          toast.error(
                            "Solana dropped the transaction, please try again"
                          );
                          console.error(e);
                          // setTimeout(() => window.location.reload(), 2000);
                          setIsUserMinting(false);
                          throw e;
                        }
                        await onMint();
                      }}
                      broadcastTransaction={false}
                      options={{ autoShowModal: false }}
                    >
                      <MintButton
                        candyMachine={candyMachine}
                        isMinting={isUserMinting}
                        setIsMinting={(val) => setIsUserMinting(val)}
                        onMint={onMint}
                        isActive={isActive || (isPresale && isWhitelistUser)}
                      />
                    </GatewayProvider>
                  ) : (
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      setIsMinting={(val) => setIsUserMinting(val)}
                      onMint={onMint}
                      isActive={isActive || (isPresale && isWhitelistUser)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <Toaster position="bottom-center" gutter={8} />
      </div>
    </div>
  );
};

const getCountdownDate = (candyMachine) => {
  if (
    candyMachine.state.isActive &&
    candyMachine.state.endSettings?.endSettingType.date
  ) {
    return toDate(candyMachine.state.endSettings.number);
  }

  return toDate(
    candyMachine.state.goLiveDate
      ? candyMachine.state.goLiveDate
      : candyMachine.state.isPresale
        ? new anchor.BN(new Date().getTime() / 1000)
        : undefined
  );
};

export default Claim;
