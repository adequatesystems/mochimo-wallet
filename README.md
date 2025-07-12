<<<<<<< HEAD
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
=======
# Mochimo Wallet

A browser extension wallet for the Mochimo cryptocurrency.

## Development

## Prerequisites

- Node.js >= 16.x and npm
- [Capacitor](https://capacitorjs.com/docs/getting-started) (`npm install -g @capacitor/cli`)
- Android Studio (for Android build and test)
- (Optional) Xcode for iOS build

**Attenzione per build iOS:**
Per installare CocoaPods serve Ruby >= 3.1. Su molti Mac è presente una versione troppo vecchia di Ruby (2.6.x) che causa errori durante l'installazione di CocoaPods.

### Installazione Ruby e CocoaPods su Mac (M1/M2/M3/Intel)

1. **Installa Ruby >= 3.1 con Homebrew:**
   ```sh
   brew install ruby
   ```
2. **Aggiungi Ruby di Homebrew al PATH:**
   ```sh
   echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc
   # Per trovare i binari dei gem installati:
   echo 'export PATH="/opt/homebrew/lib/ruby/gems/3.4.0/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ruby --version   # Deve essere almeno 3.1.x
   ```
   > Sostituisci `3.4.0` con la versione Ruby che hai installato (controlla con `ls /opt/homebrew/lib/ruby/gems/`).

3. **Installa CocoaPods:**
   ```sh
   gem install cocoapods
   ```
4. **Verifica che il comando `pod` sia disponibile:**
   ```sh
   pod --version
   ```
   Se `pod` non viene trovato, assicurati che il PATH sopra sia corretto e riavvia il terminale.

5. **(Solo la prima volta) Se hai solo le Command Line Tools e non Xcode completo:**
   - Installa Xcode dal Mac App Store.
   - Imposta la directory di Xcode:
     ```sh
     sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
     sudo xcodebuild -license
     ```

Ora puoi proseguire con la build iOS come descritto sotto.

## Install dependencies

```sh
npm install
```

## Build and preview commands

| Command                | Description                                                                 |
|------------------------|-----------------------------------------------------------------------------|
| `npm run build:web`    | Builds the webapp in `dist/web`                                              |
| `npm run preview`      | Serves the real web build from `dist/web`                                    |
| `npm run build:ext`    | Builds the Chrome Extension in `dist/extension`                              |
| `npm run build:android`| Builds the webapp, syncs with Capacitor, and compiles Android debug APK       |
| `npm run build:ios`   | Builds the webapp, syncs with Capacitor, and opens Xcode for iOS development |
| `npm run build:all`    | (Optional) Runs all main builds                                              |

## Build and test

### Webapp

1. Edit environment variables in `.env` if needed (e.g. `VITE_MESH_API_URL`).
2. Run:
   ```sh
   npm run build:web
   npm run preview
   ```
3. Open `http://localhost:4173` to view the webapp.

### Chrome Extension

1. Run:
   ```sh
   npm run build:ext
   ```
2. Load the `dist/extension` folder as an unpacked extension in Chrome.

### Android (Capacitor)

1. Make sure Android Studio is installed.
2. **(Importante!)** Su macOS/Linux, assicurati che il file `android/local.properties` contenga la riga corretta per il percorso SDK:
   ```
   sdk.dir=/Users/<TUO_USER>/Library/Android/sdk
   ```
   Sostituisci `<TUO_USER>` con il tuo username Mac.
   Su Windows:
   ```
   sdk.dir=C:\Users\<YOUR_USER>\AppData\Local\Android\Sdk
   ```
   Sostituisci `<YOUR_USER>` con il tuo username Windows.
3. Run:
   ```sh
   npm run build:android
   ```
   (Il comando funziona sia su Windows che su macOS/Linux)
4. Open the `android` folder in Android Studio and run the app on an emulator/device.

**How to manage Android emulators:**

- Open Android Studio and go to "Device Manager" (phone icon top right, or menu: Tools > Device Manager).
- Here you can see all installed emulators (AVD), create new ones, or start them by clicking the ▶️ button next to the name.
- Once the emulator is running, you can run the app from the "Run" button in Android Studio or from terminal:
  - On Windows:
    ```powershell
    cd android
    .\gradlew installDebug
    ```

  - On macOS/Linux:
    ```sh
    cd android
    ./gradlew installDebug
    ```

- To list emulators from terminal (Windows):
  ```powershell
  & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds
  ```
- To list emulators from terminal (macOS/Linux):
  ```sh
  ~/Library/Android/sdk/emulator/emulator -list-avds
  ```
- To start an emulator from terminal (macOS/Linux):
  ```sh
  ~/Library/Android/sdk/emulator/emulator -avd NOME_EMULATORE
  ```

**Nota adb su macOS/Linux:**
Se ottieni "command not found: adb", significa che adb non è nel tuo PATH. Puoi:

- Usare il percorso completo, ad esempio:
  ```sh
  ~/Library/Android/sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```
- Oppure aggiungere platform-tools al PATH temporaneamente:
  ```sh
  export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
  adb install -r android/app/build/outputs/apk/debug/app-debug.apk
  ```

Se vuoi renderlo permanente, aggiungi la riga export al tuo ~/.zshrc.


**Where to find the generated APK:**

- After build, the APK file is at:
  ```
  android/app/build/outputs/apk/debug/app-debug.apk
  ```

---

### 📲 Installare l'app direttamente su un telefono Android (senza Android Studio)

Se Android Studio crasha o vuoi installare l'app direttamente:

1. Collega il telefono al computer via USB.
2. Attiva il debug USB nelle Opzioni sviluppatore del telefono.
3. Assicurati che il comando `adb` sia disponibile (si trova in `~/Library/Android/sdk/platform-tools/adb` su Mac, oppure in `platform-tools` della cartella SDK su Windows).
4. Costruisci l'APK:
   ```sh
   npm run build:android
   ```
5. Installa l'APK sul telefono:
   ```sh
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   Se adb non è nel PATH, usa il percorso completo, ad esempio:
   ```sh
   ~/Library/Android/sdk/platform-tools/adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
6. Accetta eventuali richieste di autorizzazione sul telefono.

Ora l'app sarà installata e visibile tra le app del telefono.

---

**Windows note:**
If you get the error "adb not recognized", it means adb is not in your system PATH.
- Quick fix: use the full path, e.g.:
  ```powershell
  & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install android/app/build/outputs/apk/debug/app-debug.apk
  ```
- Or add the `platform-tools` folder of your Android SDK to your PATH environment variable to use `adb` from any terminal.

**Warning:**
If you get errors about the Android SDK (e.g. "SDK location not found"), make sure the file `android/local.properties` contains the correct line:
```
sdk.dir=C:\\Users\\<YOUR_USER>\\AppData\\Local\\Android\\Sdk
```
Replace `<YOUR_USER>` with your Windows username.

### iOS (Capacitor)

#### Prerequisiti

- Mac con Xcode installato e Xcode Command Line Tools configurati
- [CocoaPods](https://cocoapods.org/) installato (necessario per le dipendenze native)

Per installare CocoaPods:
```sh
sudo gem install cocoapods
```

#### Prima build iOS

1. Aggiungi la piattaforma iOS (solo la prima volta):
   ```sh
   npx cap add ios
   ```
2. Installa le dipendenze native:
   ```sh
   cd ios/App/App
   pod install
   cd ../../..
   ```
3. Costruisci e apri il progetto iOS:
   ```sh
   npm run build:ios
   ```
   Questo comando:
   - Costruisce la webapp in `dist/web`
   - Sincronizza Capacitor (`npx cap sync ios`)
   - Apre Xcode automaticamente (`npx cap open ios`)
4. In Xcode:
   - Seleziona il target **App** nella barra laterale a sinistra.
   - Scegli un simulatore o dispositivo fisico dal menu in alto.
   - Premi **Command+R** (oppure clicca il pulsante "Run" ▶️) per compilare e lanciare l'app.

**Nota:** Se modifichi il codice web, riesegui `npm run build:ios` per aggiornare la build iOS.


**Note importanti:**
- Se è la prima volta che apri il progetto, Xcode potrebbe chiedere di installare i pod o aggiornare i certificati.
- Per compilare su un dispositivo fisico serve un account Apple Developer e un provisioning profile valido.
- Le icone iOS vanno aggiornate manualmente in `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (puoi usare le PNG in `public/icons/` e [App Icon Generator](https://appicon.co/)).
- Se modifichi il codice web, riesegui `npm run build:ios`.

**Risoluzione problemi:**
- Se hai errori CocoaPods:
  ```sh
  cd ios/App/App && pod install && cd ../../..
  ```
- Se Xcode mostra errori di provisioning/certificati, controlla in Xcode > Signing & Capabilities.
- Non serve un account Apple per testare su simulatore.

**Build veloce senza aprire Xcode:**
```sh
npm run build:web && npx cap sync ios
```
<<<<<<< HEAD

---
>>>>>>> cf851a2 (first)
=======
>>>>>>> 3717d11 (appicon)
