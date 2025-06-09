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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenProgramId = void 0;
const spl = __importStar(require("@solana/spl-token"));
const constants_1 = require("./constants");
const getTokenProgramId = (mint) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First check if it's a Token-2022 account
        try {
            const accountInfo = yield constants_1.connection.getAccountInfo(mint);
            if (accountInfo) {
                // Check the owner of the account
                if (accountInfo.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
                    console.log(`Mint ${mint.toBase58()} is a Token-2022 token`);
                    return spl.TOKEN_2022_PROGRAM_ID;
                }
            }
        }
        catch (err) {
            // If there's an error, default to classic SPL Token
            console.log(`Error checking Token-2022 status: ${err.message}`);
        }
        // Default to classic SPL Token
        console.log(`Mint ${mint.toBase58()} is a classic SPL token`);
        return spl.TOKEN_PROGRAM_ID;
    }
    catch (error) {
        console.error(`Error determining token program ID: ${error.message}`);
        // Default to classic SPL Token
        return spl.TOKEN_PROGRAM_ID;
    }
});
exports.getTokenProgramId = getTokenProgramId;
//# sourceMappingURL=utils.js.map