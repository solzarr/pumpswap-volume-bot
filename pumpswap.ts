import { ComputeBudgetProgram, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import PumpSwapSDK from "./PumpSwapSDK";
import { isMainnet, connection } from "./constants";
import { BN } from "bn.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as spl from "@solana/spl-token";
import { getTokenProgramId } from "./utils";

export const pumpSwapBuy = async (wallet: Keypair, tokenMint: PublicKey, solAmount: number) => {
    try {
        console.log("PumpSwap Start");
        const pumpSwap = new PumpSwapSDK(isMainnet ? "mainnet" : "devnet", "confirmed");
        const pool = await pumpSwap.getPumpSwapPool(tokenMint);
        if (!pool) {
            console.log("Pool not found");
            throw new Error("Pool not found");
        }
        // Get the token program ID for the non-WSOL token
        const tokenProgramId = await getTokenProgramId(tokenMint);
        console.log("TokenProgramId", tokenProgramId.toBase58());
        // Get the token ATA with the correct program ID
        const TokenATA = await spl.getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey,
            false,
            tokenProgramId,
            spl.ASSOCIATED_TOKEN_PROGRAM_ID
        );
        console.log("TokenATA", TokenATA.toBase58());
        const QuoteATA = await spl.getAssociatedTokenAddress(
            NATIVE_MINT,
            wallet.publicKey,
            false,
            tokenProgramId,
            spl.ASSOCIATED_TOKEN_PROGRAM_ID
        );
        // Create ATA instructions with correct program IDs
        const createTokenBaseAta =
            spl.createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                TokenATA,
                wallet.publicKey,
                tokenMint,
                tokenProgramId,
                spl.ASSOCIATED_TOKEN_PROGRAM_ID
            );
        const createTokenQuoteAta =
            spl.createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                QuoteATA,
                wallet.publicKey,
                NATIVE_MINT,
                tokenProgramId,
                spl.ASSOCIATED_TOKEN_PROGRAM_ID
            );
        // Transfer enough SOL to wrap as WSOL
        const TransferLamportsWSOL = SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: QuoteATA,
            lamports: Math.trunc(
                solAmount * LAMPORTS_PER_SOL + solAmount * LAMPORTS_PER_SOL * 0.01
            ),
        });
        const syncNativeIx = spl.createSyncNativeInstruction(
            QuoteATA,
            spl.TOKEN_PROGRAM_ID
        );
        const base_amt = await pumpSwap.getBuyTokenAmount(BigInt(solAmount * LAMPORTS_PER_SOL), tokenMint)
        console.log("base_amt", base_amt.toString());
        const amount_after_slippage = pumpSwap.calculateWithSlippageBuy(base_amt, BigInt(500));
        console.log("amount_after_slippage", amount_after_slippage.toString());
        // Build the swap instructions differently for CPMM vs. Raydium/OpenBook
        const buyIx = await pumpSwap.getBuyInstruction(new BN(base_amt.toString()), new BN(amount_after_slippage.toString()), {
            pool,
            baseMint: tokenMint,
            quoteMint: NATIVE_MINT,
            baseTokenProgram: TOKEN_PROGRAM_ID,
            quoteTokenProgram: TOKEN_PROGRAM_ID,
            user: wallet.publicKey,
        })
        const transaction = new Transaction();
        const updateCpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
        const updateCuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000_000 });
        transaction.add(updateCuIx, updateCpIx, createTokenQuoteAta, createTokenBaseAta, TransferLamportsWSOL, syncNativeIx, buyIx);

        transaction.feePayer = wallet.publicKey;
        const blockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.sign(wallet);
        const sTx = transaction.serialize();
        console.log(await connection.simulateTransaction(transaction))

        const signature = await connection.sendRawTransaction(
            sTx,
            {
                preflightCommitment: 'confirmed',
                skipPreflight: false
            }
        );
        await connection.confirmTransaction({
            signature,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        })
        console.log("PumpSwap Success", signature);
        return signature;
    } catch (error) {
        console.log("Error in pumpSwap", error);
        throw new Error("Error in pumpSwap");
    }
}



export const pumpSwapSell = async (wallet: Keypair, tokenMint: PublicKey, amount: number, tokenDecimal: number) => {
    try {
        console.log("PumpSwap Start");
        const pumpSwap = new PumpSwapSDK(isMainnet ? "mainnet" : "devnet", "confirmed");
        const pool = await pumpSwap.getPumpSwapPool(tokenMint);
        if (!pool) {
            console.log("Pool not found");
            throw new Error("Pool not found");
        }
        // Get the token program ID for the non-WSOL token
        const tokenProgramId = await getTokenProgramId(tokenMint);
        console.log("TokenProgramId", tokenProgramId.toBase58());
       
        const sellAmount = new BN(amount).mul(new BN(10 ** tokenDecimal))
        const sellIx = await pumpSwap.getSellInstruction(sellAmount, new BN(0), {
            pool,
            baseMint: tokenMint,
            quoteMint: NATIVE_MINT,
            baseTokenProgram: spl.TOKEN_PROGRAM_ID,
            quoteTokenProgram: spl.TOKEN_PROGRAM_ID,
            user: wallet.publicKey,
        })

        const transaction = new Transaction();
        const updateCpIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000_000 });
        const updateCuIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000_000 });
        transaction.add(updateCuIx, updateCpIx, sellIx);

        transaction.feePayer = wallet.publicKey;
        const blockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.sign(wallet);
        const sTx = transaction.serialize();
        console.log(await connection.simulateTransaction(transaction))

        const signature = await connection.sendRawTransaction(
            sTx,
            {
                preflightCommitment: 'confirmed',
                skipPreflight: false
            }
        );
        await connection.confirmTransaction({
            signature,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        })
        console.log("PumpSwap Success", signature);
        return signature
    } catch (error) {
        console.log("Error in pumpSwap", error);
        throw new Error("Error in pumpSwap");
    }
}
