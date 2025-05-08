import { pumpSwapBuy, pumpSwapSell } from "./pumpswap";
import { tokenMint, keypair } from './constants'

pumpSwapBuy(keypair, tokenMint, 0.001)
  .then(() => {
    pumpSwapSell(keypair, tokenMint, 100, 6).catch((e) => {
      console.log("Error in selling token")
    })
  }).catch((e) => {
    console.log("Error in buying token")
  })
