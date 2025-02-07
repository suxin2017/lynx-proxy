## Certificate File Download Link

[click link to download lynx-proxy.crt file](/__self_service_path__/certificate?type=crt)

[click lint to download lynx-proxy.pem file](/__self_service_path__/certificate?type=pem)

### Android

1. **Download the Certificate File**:

   - Download the CA certificate file to your device .

2. **Install the Certificate**:

   - Open the "Settings" app.
   - Navigate to "Security" or "Privacy".
   - Select "Encryption & Credentials" or "Install Certificate".
   - Choose "CA Certificate" and click "Install".
   - Select the downloaded certificate file and confirm the installation.

3. **Verify Installation**:
   - Open a browser or app to check if the certificate can be used for secure connections.

### iOS

1. **Download the Certificate File**:

   - Download the CA certificate file to your device .

2. **Install the Certificate**:

   - Open the downloaded certificate file.
   - The system will prompt "Install Profile", click "Install".
   - Enter your device passcode and confirm the installation.

3. **Trust the Certificate**:
   - Open the "Settings" app.
   - Navigate to "General" > "About" > "Certificate Trust Settings".
   - Find the installed certificate and enable full trust.

### macOS

1. **Download the Certificate File**:

   - Download the CA certificate file to your computer .

2. **Install the Certificate**:

   - Double-click the downloaded certificate file.
   - The Keychain Access tool will open automatically.
   - Select the "System" keychain and click "Add".
   - Enter the administrator password to confirm the installation.

3. **Trust the Certificate**:
   - In the Keychain Access tool, locate the installed certificate.
   - Double-click the certificate and expand the "Trust" section.
   - Set "When using this certificate" to "Always Trust".

### Linux

1. **Download the Certificate File**:

   - Download the CA certificate file to your computer .

2. **Install the Certificate**:

   - Copy the certificate file to the `/usr/local/share/ca-certificates/` directory.
   - Run the following command to update the certificate store:
     ```bash
     sudo update-ca-certificates
     ```

3. **Verify Installation**:
   - Use `openssl` or a browser to check if the certificate is active.

### Windows

1. **Download the Certificate File**:

   - Download the CA certificate file to your computer .

2. **Install the Certificate**:

   - Right-click the certificate file and select "Install Certificate".
   - Choose "Local Machine" as the storage location and click "Next".
   - Select "Place all certificates in the following store" and click "Browse".
   - Choose "Trusted Root Certification Authorities", click "OK", and complete the installation.

3. **Verify Installation**:
   - Open a browser or app to check if the certificate can be used for secure connections.
