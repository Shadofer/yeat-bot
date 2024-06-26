import type { CommandInteraction } from "discord.js";
import { Discord, Slash } from "discordx";
import { prisma } from "../vars";
import { toggleLoggingId } from "main";

@Discord()
export class Example {
  @Slash({
    description: "Enables/Disables Luh Geeky replying based on chat history",
    name: "replying",
  })
  async replying(interaction: CommandInteraction): Promise<void> {
    const ownerId = (await interaction.client.application.fetch()).owner.id;
    const guildOwner = interaction.guild.ownerId;
    const guildId = interaction.guild.id;

    // Must be bot / guild owner
    if (interaction.user.id != ownerId && interaction.user.id != guildOwner) {
      await interaction.reply({
        content:
          "My twizzy you must contact the server owner to toggle this feature.",
        ephemeral: true,
      });

      return;
    }

    let guild = await prisma.guilds.findUnique({
      where: {
        guildId,
      },

      select: {
        logging: true,
      },
    });

    // Create if not found
    if (!guild) {
      guild = await prisma.guilds.create({
        data: {
          guildId,
        },
      });
    }

    // Toggle logging
    const newLogging = !guild.logging;

    await prisma.guilds.update({
      where: {
        guildId,
      },

      data: {
        logging: newLogging,
      },
    });

    toggleLoggingId(guildId);

    if (newLogging) {
      await interaction.reply("Luh Geeky will now reply to yall");
    } else {
      await interaction.reply("Luh Geeky will ignore yall now");
    }
  }
}
