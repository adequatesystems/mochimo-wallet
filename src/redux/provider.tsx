//implement the provider for the redux store

import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useBalancePoller } from './hooks/useBalancePoller';

const BalancePollingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useBalancePoller();
    return <>{children}</>;
};

export const MochimoWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Provider store={store}>
            <BalancePollingProvider>
                {children}
            </BalancePollingProvider>
        </Provider>
    );
};