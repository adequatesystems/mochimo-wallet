import { createAsyncThunk } from '@reduxjs/toolkit';


export const activateTagAction = createAsyncThunk(
    'network/activateTag',
    async (_, { getState, dispatch }) => {
        //not used anymore
    }
); 