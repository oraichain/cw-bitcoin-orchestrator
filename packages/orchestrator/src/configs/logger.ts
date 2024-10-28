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
        .setDescription(error?.stack)
        .setColor("Red")
        .setImage(
          "https://cdn.discordapp.com/attachments/1263547562120577058/1296729095975211050/demo.jpg?ex=67135894&is=67120714&hm=6020d73a3063554bd1eca81e81b3c378e3b84196d577c087d7311d53e6ee009a&"
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
