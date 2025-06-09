"use strict";
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
exports.PumpSwapSDK = void 0;
const anchor_1 = require("@coral-xyz/anchor");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const pump_swap_json_1 = __importDefault(require("./idl/pump-swap.json"));
const constants_1 = require("./constants");
class PumpSwapSDK {
    /**
     *
     * @param cluster "mainnet" | "devnet"
     * @param commitment "processed" | "confirmed" | "finalized"
     * @param customRPC string
     */
    constructor(cluster, commitment) {
        /**
         *
         * @param lpFeeBasisPoints BN
         * @param protocolFeeBasisPoints BN
         * @param protocolFeeRecipients Array<PublicKey>
         * @returns Promise<TransactionInstruction>
         */
        this.getCreateConfigInstruction = (lpFeeBasisPoints, protocolFeeBasisPoints, protocolFeeRecipients) => __awaiter(this, void 0, void 0, function* () {
            const ix = yield this.program.methods
                .createConfig(lpFeeBasisPoints, protocolFeeBasisPoints, protocolFeeRecipients)
                .accounts({
                program: this.program.programId,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param baseAmountOut BN
         * @param maxQuoteAmountIn BN
         * @param tradeParam TradeType
         * @returns Promise<TransactionInstruction>
         */
        this.getBuyInstruction = (baseAmountOut, maxQuoteAmountIn, tradeParam) => __awaiter(this, void 0, void 0, function* () {
            const { baseMint, baseTokenProgram, pool, quoteMint, quoteTokenProgram, user, } = tradeParam;
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            console.log("quoteMint", quoteMint.toBase58());
            const userBaseTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, user);
            const userQuoteTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(quoteMint, user);
            console.log("userBaseTokenAccount", userBaseTokenAccount.toBase58());
            const ix = yield this.program.methods
                .buy(baseAmountOut, maxQuoteAmountIn)
                .accounts({
                pool,
                globalConfig: globalConfig,
                protocolFeeRecipient: this.cluster == "mainnet"
                    ? constants_1.PROTOCOL_FEE_RECIPIENT_MAINNET
                    : constants_1.PROTOCOL_FEE_RECIPIENT,
                userBaseTokenAccount,
                userQuoteTokenAccount,
                baseTokenProgram,
                quoteTokenProgram,
                program: this.program.programId,
                user: user,
            })
                .instruction();
            return ix;
        });
        this.getPoolsWithBaseMint = (mintAddress) => __awaiter(this, void 0, void 0, function* () {
            const response = yield this.connection.getProgramAccounts(this.PUMP_AMM_PROGRAM_ID, {
                filters: [
                    { "dataSize": 300 },
                    {
                        "memcmp": {
                            "offset": 43,
                            "bytes": mintAddress.toBase58()
                        }
                    }
                ]
            });
            const mappedPools = response.map((pool) => {
                const data = Buffer.from(pool.account.data);
                const poolData = this.program.coder.accounts.decode('pool', data);
                return {
                    address: pool.pubkey,
                    is_native_base: false,
                    poolData
                };
            });
            return mappedPools;
        });
        this.getPoolsWithQuoteMint = (mintAddress) => __awaiter(this, void 0, void 0, function* () {
            const response = yield this.connection.getProgramAccounts(this.PUMP_AMM_PROGRAM_ID, {
                filters: [
                    { "dataSize": 300 },
                    {
                        "memcmp": {
                            "offset": 75,
                            "bytes": mintAddress.toBase58()
                        }
                    }
                ]
            });
            const mappedPools = response.map((pool) => {
                const data = Buffer.from(pool.account.data);
                const poolData = this.program.coder.accounts.decode('pool', data);
                return {
                    address: pool.pubkey,
                    is_native_base: true,
                    poolData
                };
            });
            return mappedPools;
        });
        this.getPoolsWithBaseMintQuoteWSOL = (mintAddress) => __awaiter(this, void 0, void 0, function* () {
            console.log("programID", this.PUMP_AMM_PROGRAM_ID.toBase58());
            const response = yield this.connection.getProgramAccounts(this.PUMP_AMM_PROGRAM_ID, {
                filters: [
                    { "dataSize": 300 },
                    {
                        "memcmp": {
                            "offset": 43,
                            "bytes": mintAddress.toBase58()
                        }
                    },
                    {
                        "memcmp": {
                            "offset": 75,
                            "bytes": this.WSOL_TOKEN_ACCOUNT.toBase58()
                        }
                    }
                ]
            });
            console.log("response", response);
            const mappedPools = response.map((pool) => {
                const data = Buffer.from(pool.account.data);
                const poolData = this.program.coder.accounts.decode('pool', data);
                return {
                    address: pool.pubkey,
                    is_native_base: true,
                    poolData
                };
            });
            return mappedPools;
        });
        this.getPriceAndLiquidity = (pool) => __awaiter(this, void 0, void 0, function* () {
            const wsolAddress = pool.poolData.poolQuoteTokenAccount;
            const tokenAddress = pool.poolData.poolBaseTokenAccount;
            const wsolBalance = yield this.connection.getTokenAccountBalance(wsolAddress);
            const tokenBalance = yield this.connection.getTokenAccountBalance(tokenAddress);
            const price = wsolBalance.value.uiAmount / tokenBalance.value.uiAmount;
            console.log("before fetching price");
            return Object.assign(Object.assign({}, pool), { price, reserves: {
                    native: wsolBalance.value.uiAmount,
                    token: tokenBalance.value.uiAmount
                } });
        });
        this.getPoolsWithPrices = (mintAddress) => __awaiter(this, void 0, void 0, function* () {
            const [poolsWithBaseMint, poolsWithQuoteMint] = yield Promise.all([
                this.getPoolsWithBaseMint(mintAddress),
                this.getPoolsWithQuoteMint(mintAddress)
            ]);
            console.log("poolsWithBaseMint", poolsWithBaseMint);
            //const poolsWithBaseMinQuoteWSOL = await getPoolsWithBaseMintQuoteWSOL(mintAddress)
            const pools = [...poolsWithBaseMint, ...poolsWithQuoteMint];
            const results = yield Promise.all(pools.map(this.getPriceAndLiquidity));
            const sortedByHighestLiquidity = results.sort((a, b) => b.reserves.native - a.reserves.native);
            return sortedByHighestLiquidity;
        });
        this.calculateWithSlippageBuy = (amount, basisPoints) => {
            return amount - (amount * basisPoints) / BigInt(10000);
        };
        this.getBuyTokenAmount = (solAmount, mint) => __awaiter(this, void 0, void 0, function* () {
            console.log("solAmount", solAmount.toString());
            const pool_detail = yield this.getPoolsWithPrices(mint);
            console.log("pool_detail", pool_detail);
            const sol_reserve = BigInt(pool_detail[0].reserves.native * web3_js_1.LAMPORTS_PER_SOL);
            const token_reserve = BigInt(Math.floor(pool_detail[0].reserves.token * Math.pow(10, 6)));
            const product = sol_reserve * token_reserve;
            let new_sol_reserve = sol_reserve + solAmount;
            let new_token_reserve = product / new_sol_reserve + BigInt(1);
            let amount_to_be_purchased = token_reserve - new_token_reserve;
            return amount_to_be_purchased;
        });
        this.getPumpSwapPool = (mint) => __awaiter(this, void 0, void 0, function* () {
            const pools = yield this.getPoolsWithBaseMintQuoteWSOL(mint);
            if (!pools || pools.length === 0) {
                return null;
            }
            return pools[0].address;
        });
        this.getPrice = (mint) => __awaiter(this, void 0, void 0, function* () {
            const pools = yield this.getPoolsWithPrices(mint);
            return pools[0].price;
        });
        /**
         *
         * @param baseAmountIn BN
         * @param minQuoteAmountOut BN
         * @param tradeParam TradeType
         * @returns Promise<TransactionInstruction>
         */
        this.getSellInstruction = (baseAmountIn, minQuoteAmountOut, tradeParam) => __awaiter(this, void 0, void 0, function* () {
            const { baseMint, baseTokenProgram, pool, quoteMint, quoteTokenProgram, user, } = tradeParam;
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const userBaseTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, user);
            const userQuoteTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(quoteMint, user);
            const ix = yield this.program.methods
                .sell(baseAmountIn, minQuoteAmountOut)
                .accounts({
                pool,
                globalConfig: globalConfig,
                program: this.program.programId,
                protocolFeeRecipient: constants_1.PROTOCOL_FEE_RECIPIENT_MAINNET,
                baseTokenProgram,
                quoteTokenProgram,
                userBaseTokenAccount,
                userQuoteTokenAccount,
                user: user,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param index number
         * @param baseAmountIn BN
         * @param quoteAmountIn BN
         * @param createPoolParam CreatePoolType
         * @param user PublicKey
         * @returns Promise<TransactionInstruction>
         */
        this.getCreatePoolInstruction = (index, baseAmountIn, quoteAmountIn, createPoolParam, user) => __awaiter(this, void 0, void 0, function* () {
            const { creator, baseMint, quoteMint, baseTokenProgram, quoteTokenProgram, } = createPoolParam;
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const userBaseTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, user);
            const userQuoteTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(quoteMint, user);
            const ix = yield this.program.methods
                .createPool(index, baseAmountIn, quoteAmountIn)
                .accounts({
                globalConfig: globalConfig,
                baseMint,
                quoteMint,
                userBaseTokenAccount,
                userQuoteTokenAccount,
                baseTokenProgram,
                quoteTokenProgram,
                creator,
                program: this.program.programId,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param lpTokenAmountOut BN
         * @param maxBaseAmountIn BN
         * @param maxQuoteAmountIn BN
         * @param depositType DepositType
         * @returns Promise<TransactionInstruction>
         */
        this.getDepositInstruction = (lpTokenAmountOut, maxBaseAmountIn, maxQuoteAmountIn, depositType) => __awaiter(this, void 0, void 0, function* () {
            const { baseMint, pool, quoteMint, user } = depositType;
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const [lpMint] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.LP_MINT_SEED), pool.toBuffer()], this.program.programId);
            const userBaseTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, user);
            const userQuoteTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(quoteMint, user);
            const userPoolTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(lpMint, user);
            const ix = yield this.program.methods
                .deposit(lpTokenAmountOut, maxBaseAmountIn, maxQuoteAmountIn)
                .accounts({
                globalConfig: globalConfig,
                pool,
                program: this.program.programId,
                userPoolTokenAccount,
                userBaseTokenAccount,
                userQuoteTokenAccount,
                user: user,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param disableCreatePool boolean
         * @param disableDeposit boolean
         * @param disableWithdraw boolean
         * @param disableBuy boolean
         * @param disableSell boolean
         * @returns Promise<TransactionInstruction>
         */
        this.getDisableInstruction = (disableCreatePool, disableDeposit, disableWithdraw, disableBuy, disableSell) => __awaiter(this, void 0, void 0, function* () {
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const ix = yield this.program.methods
                .disable(disableCreatePool, disableDeposit, disableWithdraw, disableBuy, disableSell)
                .accounts({
                globalConfig: globalConfig,
                program: this.program.programId,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param account PublicKey
         * @returns Promise<TransactionInstruction>
         */
        this.getExtendAccountInstruction = (account) => __awaiter(this, void 0, void 0, function* () {
            const ix = yield this.program.methods
                .extendAccount()
                .accounts({
                account: account,
                program: this.program.programId,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param newAdmin PublicKey
         * @returns Promise<TransactionInstruction>
         */
        this.getUpdateAdminInstruction = (newAdmin) => __awaiter(this, void 0, void 0, function* () {
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const ix = yield this.program.methods
                .updateAdmin()
                .accounts({
                globalConfig: globalConfig,
                program: this.program.programId,
                newAdmin: newAdmin,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param lpFeeBasisPoints BN
         * @param protocolFeeBasisPoints BN
         * @param protocolFeeRecipients Array<PublicKey>
         * @returns Promise<TransactionInstruction>
         */
        this.getUpdateFeeConfigInstruction = (lpFeeBasisPoints, protocolFeeBasisPoints, protocolFeeRecipients) => __awaiter(this, void 0, void 0, function* () {
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const ix = yield this.program.methods
                .updateFeeConfig(lpFeeBasisPoints, protocolFeeBasisPoints, protocolFeeRecipients)
                .accounts({
                globalConfig: globalConfig,
                program: this.program.programId,
            })
                .instruction();
            return ix;
        });
        /**
         *
         * @param lpTokenAmountIn BN
         * @param minBaseAmountOut BN
         * @param minQuoteAmountOut BN
         * @param withdrawParam WithdrawType
         * @returns Promise<TransactionInstruction>
         */
        this.getWithdrawInstruction = (lpTokenAmountIn, minBaseAmountOut, minQuoteAmountOut, withdrawParam) => __awaiter(this, void 0, void 0, function* () {
            const { baseMint, creator, index, quoteMint, user } = withdrawParam;
            const [pool] = web3_js_1.PublicKey.findProgramAddressSync([
                Buffer.from(constants_1.POOL_SEED),
                new anchor_1.BN(index).toArrayLike(Buffer, "le", 8),
                creator.toBuffer(),
                baseMint.toBuffer(),
                quoteMint.toBuffer(),
            ], this.program.programId);
            const [lpMint] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.LP_MINT_SEED), pool.toBuffer()], this.program.programId);
            const [userPoolTokenAccount] = web3_js_1.PublicKey.findProgramAddressSync([creator.toBuffer(), spl_token_1.TOKEN_2022_PROGRAM_ID.toBuffer(), lpMint.toBuffer()], this.program.programId);
            const [globalConfig] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from(constants_1.GLOBAL_CONFIG_SEED)], this.program.programId);
            const userBaseTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(baseMint, user);
            const userQuoteTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(quoteMint, user);
            const ix = yield this.program.methods
                .withdraw(lpTokenAmountIn, minBaseAmountOut, minQuoteAmountOut)
                .accounts({
                pool,
                globalConfig: globalConfig,
                userBaseTokenAccount,
                userQuoteTokenAccount,
                userPoolTokenAccount,
                program: this.program.programId,
                user: user,
            })
                .instruction();
            return ix;
        });
        const wallet = new nodewallet_1.default(web3_js_1.Keypair.generate());
        const url = cluster == "mainnet"
            ? (0, web3_js_1.clusterApiUrl)("mainnet-beta")
            : (0, web3_js_1.clusterApiUrl)("devnet");
        this.cluster = cluster;
        this.PUMP_AMM_PROGRAM_ID = new web3_js_1.PublicKey(pump_swap_json_1.default.address);
        this.WSOL_TOKEN_ACCOUNT = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
        this.connection = constants_1.connection;
        const provider = new anchor_1.AnchorProvider(this.connection, wallet, {
            commitment: commitment,
        });
        const program = new anchor_1.Program(pump_swap_json_1.default, provider);
        this.program = program;
    }
}
exports.PumpSwapSDK = PumpSwapSDK;
exports.default = PumpSwapSDK;
//# sourceMappingURL=PumpSwapSDK.js.map