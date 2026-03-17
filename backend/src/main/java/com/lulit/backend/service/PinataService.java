package com.lulit.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lulit.backend.exception.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PinataService {

    private final ObjectMapper objectMapper;

    @Value("${app.ipfs.pinata-jwt:}")
    private String pinataJwt;

    public String uploadToIpfs(MultipartFile file) {
        if (pinataJwt == null || pinataJwt.isBlank()) {
            throw new ApiException("Pinata JWT is not configured");
        }

        try {
            String boundary = "----lulit-" + UUID.randomUUID();
            byte[] body = buildMultipartBody(file, boundary);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.pinata.cloud/pinning/pinFileToIPFS"))
                    .header("Authorization", "Bearer " + pinataJwt)
                    .header("Content-Type", MediaType.MULTIPART_FORM_DATA_VALUE + "; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException("Pinata upload failed");
            }

            JsonNode json = objectMapper.readTree(response.body());
            JsonNode cidNode = json.get("IpfsHash");
            if (cidNode == null || cidNode.asText().isBlank()) {
                throw new ApiException("Pinata response did not contain CID");
            }

            return cidNode.asText();
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Failed to upload media to IPFS");
        }
    }

    public String uploadJsonToIpfs(Map<String, Object> payload) {
        if (pinataJwt == null || pinataJwt.isBlank()) {
            throw new ApiException("Pinata JWT is not configured");
        }

        try {
            String json = objectMapper.writeValueAsString(Map.of("pinataContent", payload));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.pinata.cloud/pinning/pinJSONToIPFS"))
                    .header("Authorization", "Bearer " + pinataJwt)
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ApiException("Pinata JSON upload failed");
            }

            JsonNode body = objectMapper.readTree(response.body());
            JsonNode cidNode = body.get("IpfsHash");
            if (cidNode == null || cidNode.asText().isBlank()) {
                throw new ApiException("Pinata response did not contain CID");
            }

            return cidNode.asText();
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("Failed to upload metadata to IPFS");
        }
    }

    private byte[] buildMultipartBody(MultipartFile file, String boundary) throws Exception {
        String fileName = file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename();
        byte[] fileContent = file.getBytes();
        ByteArrayOutputStream output = new ByteArrayOutputStream();

        String partHeader = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"" + fileName + "\"\r\n"
                + "Content-Type: " + (file.getContentType() == null ? "application/octet-stream" : file.getContentType()) + "\r\n\r\n";
        output.write(partHeader.getBytes(StandardCharsets.UTF_8));
        output.write(fileContent);
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));

        String end = "--" + boundary + "--\r\n";
        output.write(end.getBytes(StandardCharsets.UTF_8));
        return output.toByteArray();
    }
}
