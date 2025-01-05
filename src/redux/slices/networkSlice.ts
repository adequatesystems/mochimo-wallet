import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NetworkState {
    isLoading: boolean;
    error: Error | null;
}

const initialState: NetworkState = {
    isLoading: false,
    error: null
};

const networkSlice = createSlice({
    name: 'network',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<Error | null>) => {
            state.error = action.payload;
        }
    }
});

export const { setLoading, setError } = networkSlice.actions;
export default networkSlice.reducer; 