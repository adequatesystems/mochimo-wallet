import React, { useState, useEffect  } from 'react';
import { MochimoWalletProvider, useWallet, useAccounts } from 'mochimo-wallet';

const WalletComponent = () => {
  const { createWallet, unlockWallet, lockWallet, isLocked, error, checkWallet } = useWallet();
  const { accounts, createAccount, selectedAccount, currentWOTSKeyPair } = useAccounts();
  const [password, setPassword] = useState('');
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    const check = async () => {
      const hasWallet = await checkWallet();
      setHasWallet(hasWallet);
    };
    check();
  }, [checkWallet]);

  const handleCreateWallet = async () => {
    try {
      await createWallet(password);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await unlockWallet(password);
      console.log('Wallet created');
      // Create first account automatically
      await createAccount('Account 1');
    } catch (err) {
      console.error('Failed to create wallet:', err);
    }
  };

  const handleUnlock = async () => {
    try {
      await unlockWallet(password);
    } catch (err) {
      console.error('Failed to unlock wallet:', err);
    }
  };

  return (
    <div>
      <h1>Mochimo Wallet Example</h1>
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
        />
      </div>

      <div>
        {!hasWallet && (
          <button onClick={handleCreateWallet}>Create Wallet</button>
        )}
        
        {hasWallet && isLocked && (
          <button onClick={handleUnlock}>Unlock Wallet</button>
        )}
        
        {hasWallet && !isLocked && (
          <button onClick={lockWallet}>Lock Wallet</button>
        )}
      </div>

      {!isLocked && (
        <div>
          <h2>Accounts ({accounts.length})</h2>
          <ul>
            {accounts.map(account => (
              <li key={account.tag}>
                {account.name} - {account.tag}
                {selectedAccount === account.tag && ' (Selected)'}
              </li>
            ))}
          </ul>

          {currentWOTSKeyPair && (
            <div>
              <h3>Current WOTS Address</h3>
              <pre>{currentWOTSKeyPair.address}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <MochimoWalletProvider>
      <WalletComponent />
    </MochimoWalletProvider>
  );
};

export default App; 