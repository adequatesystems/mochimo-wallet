# @mochimo/wallet

React-integrated HD wallet implementation for Mochimo blockchain.

## Installation

```bash
npm install @mochimo/wallet
```

## Usage

```typescript
import { WalletProvider, useWallet, useAccounts } from '@mochimo/wallet';

// Wrap your app with the provider
function App() {
  return (
    <WalletProvider>
      <YourApp />
    </WalletProvider>
  );
}

// Use in components
function WalletComponent() {
  const { createWallet, loadWallet } = useWallet();
  const { accounts, activeAccount } = useAccounts();

  // ... your component logic
}
```

## Features

- HD Wallet implementation
- React hooks for wallet operations
- Account management
- Transaction creation and signing
- Secure storage integration
- Error handling
- TypeScript support

## Documentation

[Link to documentation]

## License

MIT 