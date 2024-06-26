import { importx } from "@discordx/importer";
import type { Interaction, Message, TextChannel } from "discord.js";
import { IntentsBitField } from "discord.js";
import { Client } from "discordx";
import { configDotenv } from "dotenv";
import express from "express";
import { prisma } from "./vars";

configDotenv();

let LOGGING_IDS = [];
let MENTION_ONLY_IDS = [];
const MAX_PROMPTS = 2000;

export const bot = new Client({
  // To use only guild command
  // botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],

  // Discord intents
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.MessageContent,
  ],

  // Debug logs are disabled in silent mode
  silent: true,

  // Configuration for @SimpleCommand
  simpleCommand: {
    prefix: "y.",
  },
});

function getChanceHit(percentage: number) {
  return Math.random() < percentage;
}

function getMinMax(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function addMessagePrompt(guildId: string, message: Message) {
  const guild = await prisma.guilds.findUnique({
    where: {
      guildId,
    },

    select: {
      prompts: true,
    },
  });

  // split prompts with spaces, add to existing prompts immediately
  let newPrompts = guild.prompts;
  let promptsSplit = message.content.split(" ");

  // add attachment urls aswell
  for (const set of message.attachments) {
    for (const item of set) {
      if (typeof item == "object") {
        promptsSplit.push(item.url);
      }
    }
  }

  // Some prompts will be skipped
  let addedPrompts = 0;

  // trim values
  promptsSplit = promptsSplit.map((v) => v.trim());

  // remove whitespace prompts
  promptsSplit = promptsSplit.filter((v) => v != "");

  for (const promptVal of promptsSplit) {
    // not our mention
    if (promptVal == `<@${bot.user.id}>`) continue;

    // no duplicates
    if (!newPrompts.includes(promptVal)) {
      addedPrompts++;
      newPrompts.push(promptVal);
    }
  }

  // restrict to MAX_PROMPTS
  // remove amount added from behind, keep the rest
  // [1, 2, 3] -> [1, 2, 3, 4] -> [2, 3, 4] (slice(1, 3 + 1))
  if (newPrompts.length > MAX_PROMPTS) {
    newPrompts = newPrompts.slice(addedPrompts, MAX_PROMPTS + addedPrompts);
  }

  // update prompts
  await prisma.guilds.update({
    where: {
      guildId,
    },

    data: {
      prompts: {
        set: newPrompts,
      },
    },
  });
}

async function getMessagePrompt(guildId: string): Promise<string> {
  const guild = await prisma.guilds.findUnique({
    where: {
      guildId,
    },

    select: {
      prompts: true,
    },
  });

  const prompts = [
    ...guild.prompts,
    ...[
      "luh",
      "geeky",
      "https://tenor.com/view/yeat-skibidi-skibidi-yeat-yeat-skibity-skibidi-toilet-gif-13661983242605751936",
      "ong",
      "twizzy",
      "cap",
      "perc",
      "X",
      "yeatology",
      "tonka",
      "geek",
      "honeybun",
    ],
  ];
  let finalPrompt = "";

  for (let i = 0; i < getMinMax(1, Math.min(prompts.length, 15)); i++) {
    const newPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    // skip duplicate
    if (finalPrompt.includes(newPrompt)) continue;

    finalPrompt += newPrompt;

    // space between prompts
    finalPrompt += " ";
  }

  return finalPrompt;
}

async function setupSpotify() {
  console.log(`Setting up Spotify...`);

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = `${process.env.SPOTIFY_REFRESH_TOKEN}`;
  const url = "https://accounts.spotify.com/api/token";

  async function updateAccessToken() {
    const payload = {
      method: "POST",

      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    };
    const body = await fetch(url, payload);
    const response = await body.json();

    if (response.error) {
      console.log(`Error updating Spotify credentials, error shown below`);

      console.log(response);

      process.exit(1);
    }

    process.env.SPOTIFY_ACCESS_TOKEN = response.access_token;

    return response as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };
  }

  const res = await updateAccessToken();

  setInterval(() => {
    updateAccessToken();
  }, res.expires_in * 1000); // in ms

  console.log(`Spotify credentials setup.`);
}

function setupKeepAlive() {
  console.log("Starting keep alive server...");

  const app = express();

  app.get("/keep-alive", (_, res) => {
    res.status(200).send("Luh Geeky");
  });

  app.listen(process.env.PORT || 3000);

  console.log(`Keep alive server enabled.`);
}

function showYeatASCII() {
  console.log(`+=============--------------=======-===============
=========-----------------==%@@@%==---------=======
======-------------------==%@@@@@@#=-----------====
===----------------------+@@@@@@@@@#=-------------=
=---------------====--==#@@@@%%%%%@@@+=-----=------
-------------+%@%@@##+=#@@@@@%%%%%%%@@@%#@@@@%=----
------------%@@@@@@#+===#%@@@@@@@@@@@%====#@@@@%=--
-----------=%@@@@@@@@@%@@@@@%@@@@@@@@@@%#@@@@@@%=--
-----------%%%%%%%%%%%@@@@@%#@@@%#%@@@%@%%%@@@%=---
-----------=#%%%#++%%#%@@@@@@@@@@@@@%%@@#%%%%%=----
-------------------%@%#%@@#%@@@@###%%@@%=----------
-------------------##%@%%%@%@@@@%%@@@@%@+----------
-------------------#%#%@@@%@@@@@@%%%@#@@+----------
-------------------#@%###@@@@@@@@@%#%#@%#----------
-------------------*%#@@%#%@@@@@@@%@@@%@%----------
-------------------%@##@@@#@@#%@@@@####@@----------
------------------=%@%#+*%%#*+*%%@@@##@%@=---------
------------------+@%%@%+#**++*%%@@%%%%%@=---------
------------------+@@*+%##%*%##%**%@@#*@%----------
------------------+@@@##++@@@%%%%#@#@#@@@----------
------------------+@%@#+=*@@@%%@%%*@%%#*@----------
------------------+@@##+=*@@*%%@@*%@@@%@%----------
------------------#@@%#+#%@#+%%%%#%*+#%@@=---------
------------------%@@#*+%%@=+%%@+##==#%@%----------
-----------------=%@%@@%%@*=*%#@@@===%@@=----------
-----------------=#@%@#*%@==+%@%@@=-+%@=-----------
-----------------=#%%@%%@%=-+@@##%--+%+------------
------------------*#*%%%@*--+@@*%*-----------------
--------------------#%+%%+--+%%*@+----------------=
========--=--------=%%#@@=--*@@#@+-================
===========-=--=---=%%#%#=-=%@%#%---===============
==------------------*##%+--=#%#%=----------========
-------------------+@@@@#---%@@@@%=--------------==
-----------------+%@@@@@%+--%@@@@@%----------------
----------------+#%%@@%%%=---+%%#%+----------------
------------------++++=----------------------------
  `);
}

async function setupMongo() {
  console.log(`Setting up MongoDB...`);

  await prisma.guilds.create({
    data: {
      guildId: "0",
      logging: false,
    },
  });

  await prisma.guilds.delete({
    where: {
      guildId: "0",
    },
  });

  // Fetch all guild ids that require logging
  const guilds = await prisma.guilds.findMany({
    where: {
      logging: true,
    },

    select: {
      guildId: true,
      mentionOnly: true,
    },
  });

  LOGGING_IDS = guilds.map((v) => v.guildId);

  MENTION_ONLY_IDS = guilds.filter((v) => v.mentionOnly).map((v) => v.guildId);

  console.log(`MongoDB setup complete.`);
}

function setupAutomation() {
  console.log(`Setting up automation...`);

  async function sendScheduledGuildMessages() {
    // Spam if a guild wants to
    const guilds = await prisma.guilds.findMany({
      select: {
        guildId: true,
        logging: true,
        automated: true,
        automationChannel: true,
      },
    });

    for (const guild of guilds) {
      // mightve been turned off / not enabled
      if (!guild.logging || !guild.automated) return;

      const channel = bot.channels.cache.get(
        guild.automationChannel
      ) as TextChannel;

      channel.send(await getMessagePrompt(guild.guildId)).then(() => {});
    }
  }

  setInterval(async () => await sendScheduledGuildMessages(), 30 * 60 * 1000); // 30 minutes

  console.log(`Automation setup.`);
}

bot.once("ready", async () => {
  // Synchronize applications commands with Discord
  await bot.initApplicationCommands();

  if (!process.env.DATABASE_URL) {
    console.log(`DATABASE_URL not found in the environment, exiting.`);
    process.exit(1);
  }

  await setupMongo();

  if (process.env.SPOTIFY_REFRESH_TOKEN) {
    await setupSpotify();
  }

  // Keep alive if needed
  if (process.env.KEEP_ALIVE.toLowerCase() == "true") {
    setupKeepAlive();
    showYeatASCII();
  }

  setupAutomation();

  console.log("Yeat is cookin'");
});

bot.on("interactionCreate", (interaction: Interaction) => {
  try {
    bot.executeInteraction(interaction);
  } catch (e) {}
});

bot.on("messageCreate", async (message: Message) => {
  // No simple commands in this instance, comment
  // await bot.executeCommand(message);

  // allow bots, spicy
  // if (message.author.bot) return;

  // ignore us tho
  if (message.author.id == bot.user.id) return;

  const guildId = message.guild.id;

  // no more checks
  if (
    !LOGGING_IDS.includes(guildId) ||
    (MENTION_ONLY_IDS.includes(guildId) && !message.mentions.has(bot.user.id))
  )
    return;

  // add to prompts
  await addMessagePrompt(guildId, message);

  async function attemptMessageReply() {
    // 1 in 10 chance we reply
    if (getChanceHit(0.1)) {
      await replyMessage();
    }
  }

  async function replyMessage() {
    // get prompt and send
    try {
      await message.reply(await getMessagePrompt(guildId));
    } catch (e) {}
  }

  // maybe reply if not mentioned, otherwise do it surely
  if (message.mentions.has(bot.user.id)) {
    await replyMessage();
  } else {
    await attemptMessageReply();
  }
});

async function run() {
  await importx(__dirname + "/{events,commands}/**/*.{ts,js}");

  // Let's start the bot
  if (!process.env.BOT_TOKEN) {
    throw Error("Could not find BOT_TOKEN in your environment");
  }

  // Log in with your bot token
  await bot.login(process.env.BOT_TOKEN);
}

export function resetLoggingIds() {
  LOGGING_IDS = [];
  MENTION_ONLY_IDS = [];
}

export function toggleLoggingId(guildId: string) {
  const newLogging = !LOGGING_IDS.includes(guildId);

  if (!newLogging) {
    LOGGING_IDS = LOGGING_IDS.filter((v) => v != guildId);
  } else {
    LOGGING_IDS.push(guildId);
  }
}

export function toggleMentionId(guildId: string) {
  const newMentionOnly = !MENTION_ONLY_IDS.includes(guildId);

  if (!newMentionOnly) {
    MENTION_ONLY_IDS = MENTION_ONLY_IDS.filter((v) => v != guildId);
  } else {
    MENTION_ONLY_IDS.push(guildId);
  }
}

void run();
