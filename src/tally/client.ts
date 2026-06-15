import axios from "axios";
import { loadConfig } from "../config";

export async function sendToTally(xml: string): Promise<string> {
  const config = loadConfig();
  const response = await axios.post(
    config.tally.host,
    xml,
    {
      headers: {
        "Content-Type": "text/xml"
      },
      timeout: config.tally.timeoutMs,
      responseType: "text"
    }
  );

  return response.data;
}
