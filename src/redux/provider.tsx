//implement the provider for the redux store

import { Provider } from 'react-redux';
import { store } from './store';

export const MochimoWalletProvider = ({ children }: { children: React.ReactNode }) => {
    return <Provider store={store}>{children}</Provider>;
};