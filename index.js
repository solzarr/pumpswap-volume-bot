"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pumpswap_1 = require("./pumpswap");
const constants_1 = require("./constants");
(0, pumpswap_1.pumpSwapBuy)(constants_1.keypair, constants_1.tokenMint, 0.001)
    .then(() => {
    (0, pumpswap_1.pumpSwapSell)(constants_1.keypair, constants_1.tokenMint, 1, 6).catch((e) => {
        console.log("Error in selling token");
    });
}).catch((e) => {
    console.log("Error in buying token");
});
//# sourceMappingURL=index.js.map