import { programs } from "@metaplex/js";
import * as anchor from '@project-serum/anchor';
import { web3 } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  AccountInfo,
  PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction,
} from '@solana/web3.js';
import { successAlert } from "../components/toastGroup";
import { ADMIN_LIST, DECIMALS, FLWR_DECIMALS, FLWR_TOKEN_MINT, GLOBAL_AUTHORITY_SEED, PROGRAM_ID, RAFFLE_SIZE } from "../config";
import { IDL } from "./raffle";
import { RafflePool } from './types';
import { createBrowserHistory } from "history";

const location = createBrowserHistory();
export const solConnection = new web3.Connection(web3.clusterApiUrl("devnet"));

export const getNftMetaData = async (nftMintPk: PublicKey) => {
  let { metadata: { Metadata } } = programs;
  let metadataAccount = await Metadata.getPDA(nftMintPk);
  const metadata = await Metadata.load(solConnection, metadataAccount);
  return metadata.data.data.uri;
}

export const initProject = async (
  wallet: WalletContextState
) => {
  if (!wallet.publicKey) return;
  let cloneWindow: any = window;

  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const [globalAuthority, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    program.programId
  );

  const tx = await program.rpc.initialize(
    bump, {
    accounts: {
      admin: wallet.publicKey,
      globalAuthority,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    },
    instructions: [],
    signers: [],
  });
  await solConnection.confirmTransaction(tx, "confirmed");

  await new Promise((resolve, reject) => {
    solConnection.onAccountChange(globalAuthority, (data: AccountInfo<Buffer> | null) => {
      if (!data) reject();
      resolve(true);
    });
  });

  successAlert("Success. txHash=" + tx);
  return false;
}

export const createRaffle = async (
  wallet: WalletContextState,
  nft_mint: PublicKey,
  ticketPriceSol: number,
  ticketPriceSpl: number,
  endTimestamp: number,
  max: number,
  startLoading: Function,
  closeLoading: Function
) => {

  if (!wallet.publicKey) return;
  startLoading();
  let cloneWindow: any = window;
  const userAddress = wallet.publicKey;
  console.log(userAddress.toBase58());
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const [globalAuthority, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    program.programId
  );
  try {

    let ownerNftAccount = await getAssociatedTokenAccount(userAddress, nft_mint);

    let ix0 = await getATokenAccountsNeedCreate(
      solConnection,
      userAddress,
      globalAuthority,
      [nft_mint]
    );
    console.log("Dest NFT Account = ", ix0.destinationAccounts[0].toBase58());


    let ix1 = await getATokenAccountsNeedCreate(
      solConnection,
      userAddress,
      userAddress,
      [FLWR_TOKEN_MINT]
    );

    let raffle;
    let i;

    for (i = 10; i > 0; i--) {
      raffle = await PublicKey.createWithSeed(
        userAddress,
        nft_mint.toBase58().slice(0, i),
        program.programId,
      );
      let state = await getStateByKey(raffle);
      if (state === null) {
        console.log(i);
        break;
      }
    }
    console.log(i);
    if (raffle === undefined) return;
    let ix = SystemProgram.createAccountWithSeed({
      fromPubkey: userAddress,
      basePubkey: userAddress,
      seed: nft_mint.toBase58().slice(0, i),
      newAccountPubkey: raffle,
      lamports: await solConnection.getMinimumBalanceForRentExemption(RAFFLE_SIZE),
      space: RAFFLE_SIZE,
      programId: program.programId,
    });

    const tx = await program.rpc.createRaffle(
      bump,
      new anchor.BN(ticketPriceSpl * FLWR_DECIMALS),
      new anchor.BN(ticketPriceSol * DECIMALS),
      new anchor.BN(endTimestamp),
      new anchor.BN(max),
      {
        accounts: {
          admin: wallet.publicKey,
          globalAuthority,
          raffle,
          ownerTempNftAccount: ownerNftAccount,
          destNftTokenAccount: ix0.destinationAccounts[0],
          nftMintAddress: nft_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          ix,
          ...ix0.instructions,
          ...ix1.instructions
        ],
        signers: [],
      });


    await solConnection.confirmTransaction(tx, "confirmed");
    await new Promise((resolve, reject) => {
      solConnection.onAccountChange(ix0.destinationAccounts[0], (data: AccountInfo<Buffer> | null) => {
        if (!data) reject();
        resolve(true);
      });
    });
    closeLoading();
    successAlert("You succeeded in creating a Raffle!");
    console.log("txHash =", tx);
    location.push("/raffles")
  } catch (error) {
    console.log(error)
    closeLoading();
  }

}

export const adminValidate = (
  wallet: WalletContextState
) => {
  let res = false;
  for (let item of ADMIN_LIST) {
    if (wallet.publicKey?.toBase58() === item.address) {
      res = res || true;
    }
  }
  return res;
}

export const buyTicket = async (
  wallet: WalletContextState,
  nft_mint: PublicKey,
  amount: number,
  startLoading: Function,
  closeLoading: Function
) => {
  if (!wallet.publicKey) return;
  startLoading();
  let cloneWindow: any = window;
  const userAddress = wallet.publicKey;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const [globalAuthority, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    program.programId
  );

  const raffleKey = await getRaffleKey(nft_mint);
  console.log(raffleKey)
  let raffleState = await getRaffleState(nft_mint);
  console.log(raffleState);
  if (raffleState !== null) {
    try {

      const creator = raffleState.creator;

      let userTokenAccount = await getAssociatedTokenAccount(userAddress, FLWR_TOKEN_MINT);
      let creatorTokenAccount = await getAssociatedTokenAccount(creator, FLWR_TOKEN_MINT);

      const tx = await program.rpc.buyTickets(
        bump,
        new anchor.BN(amount),
        {
          accounts: {
            buyer: userAddress,
            raffle: raffleKey,
            globalAuthority,
            creator,
            creatorTokenAccount,
            userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          },
          // instructions: [],
          signers: [],
        });
      await solConnection.confirmTransaction(tx, "confirmed");
      await new Promise((resolve, reject) => {
        solConnection.onAccountChange(userTokenAccount, (data: AccountInfo<Buffer> | null) => {
          if (!data) reject();
          resolve(true);
        });
      });
      closeLoading();
      successAlert(`You have purchased ${amount} tickets.`)
      console.log("txHash =", tx);
    } catch (error) {
      closeLoading();
      console.log(error)
    }
  } else {
    closeLoading();
    console.log("Error")
  }

}

export const getRaffleState = async (nft_mint: PublicKey): Promise<RafflePool | null> => {

  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  let poolAccounts = await solConnection.getParsedProgramAccounts(
    program.programId,
    {
      filters: [
        {
          dataSize: RAFFLE_SIZE
        },
        {
          memcmp: {
            "offset": 40,
            "bytes": nft_mint.toBase58()
          }
        }
      ]
    }
  );
  if (poolAccounts.length !== 0) {
    console.log(poolAccounts[0].pubkey.toBase58());
    let rentalKey = poolAccounts[0].pubkey;

    try {
      let rentalState = await program.account.rafflePool.fetch(rentalKey);
      return rentalState as RafflePool;
    } catch {
      return null;
    }
  } else {
    return null;
  }
}

const getRaffleStateByAddress = async (raffleAddress: PublicKey): Promise<RafflePool | null> => {
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  try {
    let rentalState = await program.account.rafflePool.fetch(raffleAddress);
    return rentalState as RafflePool;
  } catch {
    return null;
  }
}

export const revealWinner = async (
  wallet: WalletContextState,
  nft_mint: PublicKey,
  startLoading: Function,
  closeLoading: Function
) => {
  if (wallet.publicKey === null) return;
  startLoading();

  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions());
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const userAddress = wallet.publicKey;
  try {
    const raffleKey = await getRaffleKey(nft_mint);
    const tx = await program.rpc.revealWinner(
      {
        accounts: {
          buyer: userAddress,
          raffle: raffleKey,
        },
        // instructions: [],
        signers: [],
      });
    await solConnection.confirmTransaction(tx, "confirmed");
    await new Promise((resolve, reject) => {
      solConnection.onAccountChange(userAddress, (data: AccountInfo<Buffer> | null) => {
        if (!data) reject();
        resolve(true);
      });
    });
    closeLoading();
    successAlert("Successful!")
    console.log("txHash =", tx);
  } catch (error) {
    console.log(error)
    closeLoading();
  }
}

export const claimReward = async (
  wallet: WalletContextState,
  nft_mint: PublicKey,
  startLoading: Function,
  closeLoading: Function
) => {
  if (wallet.publicKey === null) return
  startLoading();
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions());
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const userAddress = wallet.publicKey;
  const [globalAuthority, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    program.programId
  );

  const raffleKey = await getRaffleKey(nft_mint);
  const srcNftTokenAccount = await getAssociatedTokenAccount(globalAuthority, nft_mint);

  let ix0 = await getATokenAccountsNeedCreate(
    solConnection,
    userAddress,
    userAddress,
    [nft_mint]
  );
  console.log("Claimer's NFT Account: ", ix0.destinationAccounts[0]);
  try {
    const tx = await program.rpc.claimReward(
      bump,
      {
        accounts: {
          claimer: userAddress,
          globalAuthority,
          raffle: raffleKey,
          claimerNftTokenAccount: ix0.destinationAccounts[0],
          srcNftTokenAccount,
          nftMintAddress: nft_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        instructions: [
          ...ix0.instructions
        ],
        signers: [],
      });
    await solConnection.confirmTransaction(tx, "confirmed");
    await new Promise((resolve, reject) => {
      solConnection.onAccountChange(ix0.destinationAccounts[0], (data: AccountInfo<Buffer> | null) => {
        if (!data) reject();
        resolve(true);
      });
    });
    closeLoading();
    successAlert("Successful claim!")
    console.log("txHash =", tx);
  } catch (error) {
    closeLoading();
    console.log(error)
  }
}

export const withdrawNft = async (
  wallet: WalletContextState,
  nft_mint: PublicKey,
  startLoading: Function,
  closeLoading: Function
) => {
  if (wallet.publicKey === null) return;
  startLoading();
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions());
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  const userAddress = wallet.publicKey;
  const [globalAuthority, bump] = await PublicKey.findProgramAddress(
    [Buffer.from(GLOBAL_AUTHORITY_SEED)],
    program.programId
  );

  const raffleKey = await getRaffleKey(nft_mint);
  const srcNftTokenAccount = await getAssociatedTokenAccount(globalAuthority, nft_mint);

  try {
    let ix0 = await getATokenAccountsNeedCreate(
      solConnection,
      userAddress,
      userAddress,
      [nft_mint]
    );
    if (raffleKey === null) return;
    let state = await getStateByKey(raffleKey);
    console.log(state?.creator.toBase58(), ' : creator')
    console.log(ix0);
    console.log("Creator's NFT Account:: ", ix0.destinationAccounts[0].toBase58());
    console.log("raffleKey: ", raffleKey?.toBase58());
    console.log("srcNftTokenAccount: ", srcNftTokenAccount.toBase58());
    const tx = await program.rpc.withdrawNft(
      bump,
      {
        accounts: {
          claimer: wallet.publicKey,
          globalAuthority,
          raffle: raffleKey,
          claimerNftTokenAccount: ix0.destinationAccounts[0],
          srcNftTokenAccount,
          nftMintAddress: nft_mint,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        // instructions: [
        //   ...ix0.instructions,
        // ],
        signers: [],
      });
    await solConnection.confirmTransaction(tx, "confirmed");

    await new Promise((resolve, reject) => {
      solConnection.onAccountChange(ix0.destinationAccounts[0], (data: AccountInfo<Buffer> | null) => {
        if (!data) reject();
        resolve(true);
      });
    });
    closeLoading();
    successAlert("Successful withdraw");
    location.push("/raffles");
    console.log("txHash =", tx);
  } catch (error) {
    closeLoading()
    console.log(error)
  }

}

export const getRaffleGlobalState = async () => {
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  let poolAccounts = await solConnection.getParsedProgramAccounts(
    program.programId,
    {
      filters: [
        {
          dataSize: RAFFLE_SIZE
        }
      ]
    }
  );
  if (poolAccounts.length !== 0) {
    let tempData = [];
    for (let i = 0; i < poolAccounts.length; i++) {
      const data = await getRaffleStateByAddress(poolAccounts[i].pubkey)
      tempData.push(data)
    }
    return tempData;
  } else {
    return null;
  }
}

export const getRaffleDataByMintAddress = async (mintAddress: PublicKey) => {
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  let poolAccounts = await solConnection.getParsedProgramAccounts(
    program.programId,
    {
      filters: [
        {
          dataSize: RAFFLE_SIZE
        }
      ]
    }
  );
  let res;
  if (poolAccounts.length !== 0) {
    for (let i = 0; i < poolAccounts.length; i++) {
      const data = await getRaffleStateByAddress(poolAccounts[i].pubkey)
      console.log(data?.nftMint.toBase58() === mintAddress.toBase58())
      if (data?.nftMint.toBase58() === mintAddress.toBase58()) {
        res = data
      }
    }
    return res;
  } else {
    return null;
  }
}

export const getStateByKey = async (
  raffleKey: PublicKey
): Promise<RafflePool | null> => {
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  try {
    let rentalState = await program.account.rafflePool.fetch(raffleKey);
    return rentalState as RafflePool;
  } catch {
    return null;
  }
}

export const getRaffleKey = async (
  nft_mint: PublicKey
): Promise<PublicKey | null> => {
  let cloneWindow: any = window;
  let provider = new anchor.Provider(solConnection, cloneWindow['solana'], anchor.Provider.defaultOptions())
  const program = new anchor.Program(IDL as anchor.Idl, PROGRAM_ID, provider);
  let poolAccounts = await solConnection.getParsedProgramAccounts(
    program.programId,
    {
      filters: [
        {
          dataSize: RAFFLE_SIZE
        },
        {
          memcmp: {
            "offset": 40,
            "bytes": nft_mint.toBase58()
          }
        }
      ]
    }
  );
  if (poolAccounts.length !== 0) {
    let len = poolAccounts.length;
    console.log(len);
    let max = 0;
    let maxId = 0;
    for (let i = 0; i < len; i++) {
      let state = await getStateByKey(poolAccounts[i].pubkey);
      if (state === null) break;
      if (state.endTimestamp.toNumber() > max) {
        maxId = i;
      }
    }
    let raffleKey = poolAccounts[maxId].pubkey;
    return raffleKey;
  } else {
    return null;
  }
}

const getAssociatedTokenAccount = async (ownerPubkey: PublicKey, mintPk: PublicKey): Promise<PublicKey> => {
  let associatedTokenAccountPubkey = (await PublicKey.findProgramAddress(
    [
      ownerPubkey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintPk.toBuffer(), // mint address
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  ))[0];
  return associatedTokenAccountPubkey;
}

export const getATokenAccountsNeedCreate = async (
  connection: anchor.web3.Connection,
  walletAddress: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
  nfts: anchor.web3.PublicKey[],
) => {
  let instructions = [], destinationAccounts = [];
  for (const mint of nfts) {
    const destinationPubkey = await getAssociatedTokenAccount(owner, mint);
    let response = await connection.getAccountInfo(destinationPubkey);
    if (!response) {
      const createATAIx = createAssociatedTokenAccountInstruction(
        destinationPubkey,
        walletAddress,
        owner,
        mint,
      );
      instructions.push(createATAIx);
    }
    destinationAccounts.push(destinationPubkey);
    if (walletAddress !== owner) {
      const userAccount = await getAssociatedTokenAccount(walletAddress, mint);
      response = await connection.getAccountInfo(userAccount);
      if (!response) {
        const createATAIx = createAssociatedTokenAccountInstruction(
          userAccount,
          walletAddress,
          walletAddress,
          mint,
        );
        instructions.push(createATAIx);
      }
    }
  }
  return {
    instructions,
    destinationAccounts,
  };
}

export const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}
