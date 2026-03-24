import axios from "axios";
import FormData from "form-data";
import { SocksProxyAgent } from "socks-proxy-agent";
import { config } from "../config.js";

function assertPinataConfigured() {
  if (!config.pinataJwt) {
    throw new Error("PINATA_JWT is required for decentralized message storage");
  }
}

function createGatewayAgent() {
  if (!config.torSocksUrl) {
    return null;
  }
  return new SocksProxyAgent(config.torSocksUrl);
}

export async function uploadEncryptedEnvelope(envelope) {
  assertPinataConfigured();
  const form = new FormData();
  form.append("file", Buffer.from(JSON.stringify(envelope, null, 2), "utf8"), {
    filename: "message.json",
    contentType: "application/json"
  });
  form.append("network", "public");

  const response = await axios.post("https://uploads.pinata.cloud/v3/files", form, {
    headers: {
      Authorization: `Bearer ${config.pinataJwt}`,
      ...form.getHeaders()
    },
    maxBodyLength: Infinity,
    timeout: 30000
  });

  return response.data?.data?.cid || response.data?.cid || response.data?.IpfsHash;
}

export async function fetchEncryptedEnvelope(cid) {
  const gatewayUrl = `${config.pinataGatewayUrl.replace(/\/$/, "")}/${cid}`;
  const agent = createGatewayAgent();
  const response = await axios.get(gatewayUrl, {
    httpAgent: agent || undefined,
    httpsAgent: agent || undefined,
    responseType: "json",
    timeout: 30000
  });
  return response.data;
}
