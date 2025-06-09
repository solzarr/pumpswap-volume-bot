"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pumpSwapSell = exports.pumpSwapBuy = void 0;
const web3_js_1 = require("@solana/web3.js");
const PumpSwapSDK_1 = __importDefault(require("./PumpSwapSDK"));
const constants_1 = require("./constants");
const bn_js_1 = require("bn.js");
const spl_token_1 = require("@solana/spl-token");
const spl = __importStar(require("@solana/spl-token"));
const utils_1 = require("./utils");
const pumpSwapBuy = (wallet, tokenMint, solAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("PumpSwap Start");
        const pumpSwap = new PumpSwapSDK_1.default(constants_1.isMainnet ? "mainnet" : "devnet", "confirmed");
        const pool = yield pumpSwap.getPumpSwapPool(tokenMint);
        if (!pool) {
            console.log("Pool not found");
            throw new Error("Pool not found");
        }
        // Get the token program ID for the non-WSOL token
        const tokenProgramId = yield (0, utils_1.getTokenProgramId)(tokenMint);
        console.log("TokenProgramId", tokenProgramId.toBase58());
        // Get the token ATA with the correct program ID
        const TokenATA = yield spl.getAssociatedTokenAddress(tokenMint, wallet.publicKey, false, tokenProgramId, spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        console.log("TokenATA", TokenATA.toBase58());
        const QuoteATA = yield spl.getAssociatedTokenAddress(spl_token_1.NATIVE_MINT, wallet.publicKey, false, tokenProgramId, spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        // Create ATA instructions with correct program IDs
        const createTokenBaseAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, TokenATA, wallet.publicKey, tokenMint, tokenProgramId, spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        const createTokenQuoteAta = spl.createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, QuoteATA, wallet.publicKey, spl_token_1.NATIVE_MINT, tokenProgramId, spl.ASSOCIATED_TOKEN_PROGRAM_ID);
        // Transfer enough SOL to wrap as WSOL
        const TransferLamportsWSOL = web3_js_1.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: QuoteATA,
            lamports: Math.trunc(solAmount * web3_js_1.LAMPORTS_PER_SOL + solAmount * web3_js_1.LAMPORTS_PER_SOL * 0.01),
        });
        const syncNativeIx = spl.createSyncNativeInstruction(QuoteATA, spl.TOKEN_PROGRAM_ID);
        const base_amt = yield pumpSwap.getBuyTokenAmount(BigInt(solAmount * web3_js_1.LAMPORTS_PER_SOL), tokenMint);
        console.log("base_amt", base_amt.toString());
        const amount_after_slippage = pumpSwap.calculateWithSlippageBuy(base_amt, BigInt(500));
        console.log("amount_after_slippage", amount_after_slippage.toString());
        // Build the swap instructions differently for CPMM vs. Raydium/OpenBook
        const buyIx = yield pumpSwap.getBuyInstruction(new bn_js_1.BN(base_amt.toString()), new bn_js_1.BN(amount_after_slippage.toString()), {
            pool,
            baseMint: tokenMint,
            quoteMint: spl_token_1.NATIVE_MINT,
            baseTokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            quoteTokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            user: wallet.publicKey,
        });
        const transaction = new web3_js_1.Transaction();
        const updateCpIx = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 });
        const updateCuIx = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 });
        transaction.add(updateCuIx, updateCpIx, createTokenQuoteAta, createTokenBaseAta, TransferLamportsWSOL, syncNativeIx, buyIx);
        transaction.feePayer = wallet.publicKey;
        const blockhash = yield constants_1.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.sign(wallet);
        const sTx = transaction.serialize();
        console.log(yield constants_1.connection.simulateTransaction(transaction));
        const signature = yield constants_1.connection.sendRawTransaction(sTx, {
            preflightCommitment: 'confirmed',
            skipPreflight: false
        });
        yield constants_1.connection.confirmTransaction({
            signature,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        });
        console.log("PumpSwap Success", signature);
        return signature;
    }
    catch (error) {
        console.log("Error in pumpSwap", error);
        throw new Error("Error in pumpSwap");
    }
});
exports.pumpSwapBuy = pumpSwapBuy;
const pumpSwapSell = (wallet, tokenMint, amount, tokenDecimal) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("PumpSwap Start");
        const pumpSwap = new PumpSwapSDK_1.default(constants_1.isMainnet ? "mainnet" : "devnet", "confirmed");
        const pool = yield pumpSwap.getPumpSwapPool(tokenMint);
        if (!pool) {
            console.log("Pool not found");
            throw new Error("Pool not found");
        }
        // Get the token program ID for the non-WSOL token
        const tokenProgramId = yield (0, utils_1.getTokenProgramId)(tokenMint);
        console.log("TokenProgramId", tokenProgramId.toBase58());
        const sellAmount = new bn_js_1.BN(amount).mul(new bn_js_1.BN(Math.pow(10, tokenDecimal)));
        const sellIx = yield pumpSwap.getSellInstruction(sellAmount, new bn_js_1.BN(0), {
            pool,
            baseMint: tokenMint,
            quoteMint: spl_token_1.NATIVE_MINT,
            baseTokenProgram: spl.TOKEN_PROGRAM_ID,
            quoteTokenProgram: spl.TOKEN_PROGRAM_ID,
            user: wallet.publicKey,
        });
        const transaction = new web3_js_1.Transaction();
        const updateCpIx = web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 });
        const updateCuIx = web3_js_1.ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 });
        transaction.add(updateCuIx, updateCpIx, sellIx);
        transaction.feePayer = wallet.publicKey;
        const blockhash = yield constants_1.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.sign(wallet);
        const sTx = transaction.serialize();
        console.log(yield constants_1.connection.simulateTransaction(transaction));
        const signature = yield constants_1.connection.sendRawTransaction(sTx, {
            preflightCommitment: 'confirmed',
            skipPreflight: false
        });
        yield constants_1.connection.confirmTransaction({
            signature,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: blockhash.lastValidBlockHeight
        });
        console.log("PumpSwap Success", signature);
        return signature;
    }
    catch (error) {
        console.log("Error in pumpSwap", error);
        throw new Error("Error in pumpSwap");
    }
});
exports.pumpSwapSell = pumpSwapSell;
//# sourceMappingURL=pumpswap.js.map