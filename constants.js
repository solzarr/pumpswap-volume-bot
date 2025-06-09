"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMainnet = exports.POOL_SEED = exports.LP_MINT_SEED = exports.GLOBAL_CONFIG_SEED = exports.PROTOCOL_FEE_RECIPIENT_MAINNET = exports.PROTOCOL_FEE_RECIPIENT = exports.connection = exports.keypair = exports.tokenMint = void 0;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const PROTOCOL_FEE_RECIPIENT = new web3_js_1.PublicKey("12e2F4DKkD3Lff6WPYsU7Xd76SHPEyN9T8XSsTJNF8oT");
exports.PROTOCOL_FEE_RECIPIENT = PROTOCOL_FEE_RECIPIENT;
const PROTOCOL_FEE_RECIPIENT_MAINNET = new web3_js_1.PublicKey("7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX");
exports.PROTOCOL_FEE_RECIPIENT_MAINNET = PROTOCOL_FEE_RECIPIENT_MAINNET;
const GLOBAL_CONFIG_SEED = 'global_config';
exports.GLOBAL_CONFIG_SEED = GLOBAL_CONFIG_SEED;
const LP_MINT_SEED = 'pool_lp_mint';
exports.LP_MINT_SEED = LP_MINT_SEED;
const POOL_SEED = 'pool';
exports.POOL_SEED = POOL_SEED;
exports.tokenMint = new web3_js_1.PublicKey(process.env.TOKEN_MINT || "");
exports.keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(process.env.PRIVATE_KEY || ""));
exports.connection = new web3_js_1.Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
exports.isMainnet = true;
//# sourceMappingURL=constants.js.map