//implement the provider for the redux store

import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

interface Props {
    children: React.ReactNode;
}

export const MochimoWalletProvider: React.FC<Props> = ({ children }) => {
    return <Provider store={store}>{children}</Provider>;
};