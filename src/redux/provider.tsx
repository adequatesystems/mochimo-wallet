//implement the provider for the redux store

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { useNetworkSync } from './hooks/useNetworkSync';
import { applyActiveNetworkInstance, hydrateProviders } from './slices/providerSlice';
import { store } from './store';

const NetworkSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useNetworkSync();
    useEffect(() => {
        // hydrate provider catalogs and apply active network instance
        store.dispatch(hydrateProviders()).then(() => {
            store.dispatch(applyActiveNetworkInstance());
        });
    }, []);
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