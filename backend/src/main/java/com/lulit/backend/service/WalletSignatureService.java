package com.lulit.backend.service;

import com.lulit.backend.exception.ApiException;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;

@Service
public class WalletSignatureService {

    public void verifyPersonalSignature(String expectedWallet, String message, String signatureHex) {
        String normalizedWallet = normalizeWallet(expectedWallet);
        if (message == null || message.isBlank()) {
            throw new ApiException("Message is required");
        }
        if (signatureHex == null || signatureHex.isBlank()) {
            throw new ApiException("Signature is required");
        }

        try {
            Sign.SignatureData signatureData = parseSignature(signatureHex.trim());
            BigInteger publicKey = Sign.signedPrefixedMessageToKey(
                    message.getBytes(StandardCharsets.UTF_8),
                    signatureData
            );
            String recovered = "0x" + Keys.getAddress(publicKey);
            if (!recovered.equalsIgnoreCase(normalizedWallet)) {
                throw new ApiException("Signature does not match wallet");
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Invalid signature");
        }
    }

    public String normalizeWallet(String raw) {
        if (raw == null) {
            throw new ApiException("Wallet is required");
        }
        String value = raw.trim();
        if (!value.matches("^0x[0-9a-fA-F]{40}$")) {
            throw new ApiException("Invalid wallet address");
        }
        return value;
    }

    private Sign.SignatureData parseSignature(String signatureHex) {
        String clean = Numeric.cleanHexPrefix(signatureHex);
        if (clean.length() != 130) {
            throw new ApiException("Invalid signature format");
        }
        byte[] sig = Numeric.hexStringToByteArray("0x" + clean);
        byte v = sig[64];
        if (v < 27) {
            v += 27;
        }
        byte[] r = new byte[32];
        byte[] s = new byte[32];
        System.arraycopy(sig, 0, r, 0, 32);
        System.arraycopy(sig, 32, s, 0, 32);
        return new Sign.SignatureData(v, r, s);
    }
}
