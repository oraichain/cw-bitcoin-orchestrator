import { EmbedBuilder, WebhookClient } from "discord.js";
import env from "./env";

const webhookClient = env.logger.webhookUrl
  ? new WebhookClient({
      url: env.logger.webhookUrl as string,
    })
  : undefined;

export const logger = (label: string, loglevel?: string): any => {
  return {
    info: (text: string) =>
      console.info(`${new Date().toLocaleString()} [INFO] [${label}]: ${text}`),
    error: (text: string, error: Error) => {
      if (webhookClient) {
        const embed = new EmbedBuilder({
          title: text,
          description:
            error?.stack || error?.message || "Something went wrong!",
        })
          .setColor("#0099ff")
          .setImage(
            "https://cdn.discordapp.com/attachments/1263547562120577058/1296729095975211050/demo.jpg?ex=67135894&is=67120714&hm=6020d73a3063554bd1eca81e81b3c378e3b84196d577c087d7311d53e6ee009a&"
          );
        webhookClient.send({
          embeds: [embed],
        });
      }
      console.error(
        `${new Date().toLocaleString()} [ERROR] [${label}]: ${text}, ${error}`
      );
    },
  };
};
