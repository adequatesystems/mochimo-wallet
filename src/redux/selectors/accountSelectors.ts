import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Derivation } from '../utils/derivation';
import { WOTSWallet } from 'mochimo-wots';

const isNil = (value: any) => value === null || value === undefined;

export const selectAccounts = (state: RootState) => state.accounts.accounts;

export const selectSelectedAccount = (state: RootState) => {
    const selectedId = state.accounts.selectedAccount;
    return selectedId ? state.accounts.accounts[selectedId] : null;
};

export const selectOrderedAccounts = createSelector(
    selectAccounts,
    (accounts) => Object.values(accounts).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
);

export const selectCurrentWOTSKeyPair = createSelector(
    [selectSelectedAccount],
    (account) => {
        if (!account) return null;
        if (account.wotsIndex === -1) {
            console.log('wots index - 1', account.faddress, account.seed, account.tag)
            return {
                address: account.faddress, secret: account.seed, wotsWallet: WOTSWallet.create('test', Buffer.from(account.seed, 'hex'), undefined, (bytes) => {
                    const addrHex = Buffer.from(account.faddress, 'hex')
                    for (let i = 0; i < addrHex.length; i++) {
                        bytes[i] = addrHex[i]
                    }
                })
            };
        }

        //otherwise derive from seed and tag

        const { address, secret, wotsWallet } = Derivation.deriveWotsSeedAndAddress(
            Buffer.from(account.seed, 'hex'),
            account.wotsIndex,
            account.tag
        );
        console.log('wots index', account.wotsIndex, account.faddress, account.seed, wotsWallet)

        return { address: Buffer.from(address).toString('hex'), secret: Buffer.from(secret).toString('hex'), wotsWallet };

    }
);

export const selectNextWOTSKeyPair = createSelector(
    [selectSelectedAccount],
    (account) => {
        if (!account) return null;


        if (!account.seed) {
            throw new Error('Account has no seed');
        }


        const { address, secret, wotsWallet } = Derivation.deriveWotsSeedAndAddress(
            Buffer.from(account.seed, 'hex'),
            account.wotsIndex + 1, // Next index
            account.tag
        );

        return {
            address: Buffer.from(address).toString('hex'),
            secret: Buffer.from(secret).toString('hex'),
            wotsWallet
        };

    }
);


