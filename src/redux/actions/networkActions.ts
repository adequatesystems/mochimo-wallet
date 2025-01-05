import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { setLoading, setError } from '../slices/networkSlice';
import { NetworkProvider } from '../context/NetworkContext';
import { Derivation } from '../utils/derivation';
import { selectSelectedAccount } from '../selectors/accountSelectors';
import { SessionManager } from '../context/SessionContext';

export const activateTagAction = createAsyncThunk(
    'network/activateTag',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const {  activeAccount } = state.wallet;
        const networkService = NetworkProvider.getNetwork();
        if (!activeAccount) {
            throw new Error('No active account');
        }
  
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            const selectedAccount = selectSelectedAccount(state);
            if(!selectedAccount) {
                throw new Error('No selected account');
            }
            
            if (!selectedAccount.faddress) throw new Error('Wots address not found');
            
            await networkService.activateTag(selectedAccount.faddress);
        } catch (error) {
            dispatch(setError(error as Error));
            throw error;
        } finally {
            dispatch(setLoading(false));
        }
    }
); 