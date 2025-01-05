import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { activateTagAction } from '../actions/networkActions';

export const useNetwork = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(state => state.network.isLoading);
    const error = useAppSelector(state => state.network.error);

    const activateTag = useCallback(async () => {
        await dispatch(activateTagAction()).unwrap();
    }, [dispatch]);

    return {
        isLoading,
        error,
        activateTag
    };
}; 