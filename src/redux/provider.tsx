//implement the provider for the redux store

import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useNetworkSync } from './hooks/useNetworkSync';

const NetworkSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useNetworkSync();
    return <>{children}</>;
};

export const MochimoWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <Provider store={store}>
            <NetworkSyncProvider>
                {children}
            </NetworkSyncProvider>
        </Provider>
    );
};