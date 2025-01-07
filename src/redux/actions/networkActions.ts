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
        const selectedAccount = selectSelectedAccount(state);
        if (!selectedAccount) {
            throw new Error('No account selected');
        }
        const networkService = NetworkProvider.getNetwork();
  
        dispatch(setLoading(true));
        dispatch(setError(null));

        try {


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