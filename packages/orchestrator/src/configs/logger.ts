import { EmbedBuilder, WebhookClient } from "discord.js";
import env from "./env";

export const logger = (label: string, loglevel?: string): any => {
  return {
    info: (text: string) =>
      console.info(`${new Date().toLocaleString()} [INFO] [${label}]: ${text}`),
    error: (text: string, error: Error) => {
      const webhookClient = new WebhookClient({
        url: env.logger.webhookUrl as string,
      });
      const embed = new EmbedBuilder()
        .setTitle(text)
        .setDescription(error.stack)
        .setColor("Red")
        .setImage(
          "https://miro.medium.com/v2/resize:fit:1400/format:webp/1*PnNRGFIy2mTXtIJzNAoy_A.jpeg"
        );
      webhookClient.send({
        embeds: [embed],
      });
      console.error(
        `${new Date().toLocaleString()} [ERROR] [${label}]: ${text}, ${error}`
      );
    },
  };
};
