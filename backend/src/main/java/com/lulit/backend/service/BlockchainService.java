package com.lulit.backend.service;

import com.lulit.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Collections;
import java.util.List;

@Service
public class BlockchainService {
    private static final long POLYGON_MUMBAI_CHAIN_ID = 80001L;


    @Value("${app.blockchain.enabled:false}")
    private boolean enabled;

    @Value("${app.blockchain.rpc-url:}")
    private String rpcUrl;

    @Value("${app.blockchain.private-key:}")
    private String privateKey;

    @Value("${app.blockchain.contract-address:}")
    private String contractAddress;

    public String recordPostCid(String cid) {
        if (!enabled) {
            return null;
        }
        if (rpcUrl.isBlank() || privateKey.isBlank() || contractAddress.isBlank()) {
            throw new ApiException("Blockchain configuration is incomplete");
        }

        Web3j web3j = Web3j.build(new HttpService(rpcUrl));
        try {
            Credentials credentials = Credentials.create(privateKey);

            Function function = new Function(
                    "createPost",
                    List.of(new Utf8String(cid)),
                    Collections.<TypeReference<?>>emptyList()
            );
            String data = FunctionEncoder.encode(function);

            EthGetTransactionCount txCount = web3j.ethGetTransactionCount(
                    credentials.getAddress(),
                    DefaultBlockParameterName.LATEST
            ).send();

            BigInteger nonce = txCount.getTransactionCount();
            BigInteger gasPrice = web3j.ethGasPrice().send().getGasPrice();
            BigInteger gasLimit = BigInteger.valueOf(300_000);
            RawTransaction rawTx = RawTransaction.createTransaction(
                    nonce,
                    gasPrice,
                    gasLimit,
                    contractAddress,
                    BigInteger.ZERO,
                    data
            );

            byte[] signed = org.web3j.crypto.TransactionEncoder.signMessage(rawTx, POLYGON_MUMBAI_CHAIN_ID, credentials);
            String hexValue = Numeric.toHexString(signed);
            EthSendTransaction sent = web3j.ethSendRawTransaction(hexValue).send();
            if (sent.hasError()) {
                throw new ApiException("Blockchain transaction failed: " + sent.getError().getMessage());
            }
            return sent.getTransactionHash();
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Failed to write CID to blockchain");
        } finally {
            web3j.shutdown();
        }
    }
}
