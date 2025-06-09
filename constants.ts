import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import base58 from "bs58"
import { configDotenv } from "dotenv";
configDotenv()

const PROTOCOL_FEE_RECIPIENT = new PublicKey("12e2F4DKkD3Lff6WPYsU7Xd76SHPEyN9T8XSsTJNF8oT")
const PROTOCOL_FEE_RECIPIENT_MAINNET = new PublicKey("7hTckgnGnLQR6sdH7YkqFTAA7VwTfYFaZ6EhEsU3saCX")
const GLOBAL_CONFIG_SEED = 'global_config'
const LP_MINT_SEED = 'pool_lp_mint'
const POOL_SEED = 'pool'

export const tokenMint = new PublicKey(process.env.TOKEN_MINT || "")
export const keypair = Keypair.fromSecretKey(base58.decode(process.env.PRIVATE_KEY || ""))
export const connection = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed")
export {
    PROTOCOL_FEE_RECIPIENT,
    PROTOCOL_FEE_RECIPIENT_MAINNET,
    GLOBAL_CONFIG_SEED,
    LP_MINT_SEED,
    POOL_SEED
}
export const isMainnet = true;
