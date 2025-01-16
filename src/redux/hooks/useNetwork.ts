import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useNetwork = () => {
    const networkState = useSelector((state: RootState) => state.network);
    return {
        blockHeight: networkState.blockHeight,
        isConnected: networkState.isConnected,
        error: networkState.error
    };
}; 