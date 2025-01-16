import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
    blockHeight: number;
    isConnected: boolean;
    error: string | null;
}

const initialState: NetworkState = {
    blockHeight: 0,
    isConnected: false,
    error: null
};

const networkSlice = createSlice({
    name: 'network',
    initialState,
    reducers: {
        setBlockHeight: (state, action: PayloadAction<number>) => {
            state.blockHeight = action.payload;
        },
        setNetworkStatus: (state, action: PayloadAction<{ isConnected: boolean; error?: string }>) => {
            state.isConnected = action.payload.isConnected;
            state.error = action.payload.error || null;
        }
    }
});

export const { setBlockHeight, setNetworkStatus } = networkSlice.actions;
export default networkSlice.reducer; 